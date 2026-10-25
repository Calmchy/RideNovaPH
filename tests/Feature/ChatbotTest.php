<?php

use App\Models\ChatbotIntent;
use Tests\Support\Scenario;

beforeEach(fn () => Scenario::lookups());

test('guests get an answer from Nova', function () {
    $this->postJson('/chatbot', ['message' => 'How do I book a ride?'])->assertOk()->assertJsonPath('reply', fn ($r) => str_contains($r, 'Review & Reserve'));
});

test('keywords match whole words only ("paid" must not trigger the ID intent)', function () {
    expect(ChatbotIntent::replyFor('I already paid'))->toBeNull();
});

test('the intent with the most matching words wins', function () {
    $reply = ChatbotIntent::replyFor('how much is the fare price and how do I pay');
    expect($reply)->toContain('fare');
});

test('unknown questions get a polite fallback, empty or huge ones are rejected', function () {
    $this->postJson('/chatbot', ['message' => 'zzzz qqqq'])->assertOk()->assertJsonPath('reply', fn ($r) => str_contains($r, 'not sure'));
    $this->postJson('/chatbot', ['message' => ''])->assertStatus(422);
    $this->postJson('/chatbot', ['message' => str_repeat('a', 301)])->assertStatus(422);
});

test('signed-in users asking about their bookings get a personal answer', function () {
    $this->actingAs(Scenario::passenger())->postJson('/chatbot', ['message' => 'where are my bookings'])
        ->assertOk()->assertJsonPath('reply', fn ($r) => str_contains($r, "don't have any bookings"));
});

test('the chatbot is rate limited', function () {
    foreach (range(1, 20) as $i) {
        $this->postJson('/chatbot', ['message' => 'hello'])->assertOk();
    }
    $this->postJson('/chatbot', ['message' => 'hello'])->assertStatus(429);
});
