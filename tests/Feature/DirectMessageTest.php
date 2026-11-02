<?php

use App\Models\DirectMessage;
use App\Models\User;
use Tests\Support\Scenario;

beforeEach(function () {
    $this->withoutVite();
    Scenario::lookups();
    $this->driver = Scenario::driver(true);
    Scenario::approveId($this->driver);
    Scenario::vehicle($this->driver, 4);
    $this->passenger = Scenario::passenger(true);
});

it('shows the driver contact number and the message box on the driver profile', function () {
    $this->driver->forceFill(['phone_number' => '09181234567'])->save();

    $this->actingAs($this->passenger)->get('/drivers/'.$this->driver->id)->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('driver.phone', '09181234567')
            ->where('chat.url', '/messages/'.$this->driver->id.'/chat'));

    // The driver looking at their own page gets no message box.
    $this->actingAs($this->driver)->get('/drivers/'.$this->driver->id)
        ->assertInertia(fn ($page) => $page->where('chat', null));
});

it('lets a passenger message a verified driver, who is notified once and can reply', function () {
    $this->actingAs($this->passenger)->postJson('/messages/'.$this->driver->id.'/chat', ['body' => '  <b>Hello</b> there  '])
        ->assertCreated()->assertJsonPath('message.body', 'Hello there')->assertJsonPath('message.mine', true);
    $this->actingAs($this->passenger)->postJson('/messages/'.$this->driver->id.'/chat', ['body' => 'Are you free Saturday?'])->assertCreated();

    // One notification for the two messages in a row.
    expect($this->driver->notifications()->count())->toBe(1);

    // The driver sees both (as not mine), the poll only returns newer ones, and reading marks them read.
    $this->actingAs($this->driver)->getJson('/messages/'.$this->passenger->id.'/chat?after=0')
        ->assertOk()->assertJsonCount(2, 'messages')->assertJsonPath('messages.0.mine', false);
    expect(DirectMessage::whereNull('read_at')->count())->toBe(0);

    $first = DirectMessage::orderBy('id')->first()->id;
    $this->actingAs($this->driver)->getJson('/messages/'.$this->passenger->id.'/chat?after='.$first)->assertJsonCount(1, 'messages');

    // The driver can answer someone who wrote to them.
    $this->actingAs($this->driver)->postJson('/messages/'.$this->passenger->id.'/chat', ['body' => 'Yes, Saturday works.'])->assertCreated();
    expect($this->passenger->notifications()->count())->toBe(1);
});

it('does not let people message strangers or write empty / huge messages', function () {
    $stranger = User::factory()->create();
    $this->actingAs($this->passenger)->postJson('/messages/'.$stranger->id.'/chat', ['body' => 'hi'])->assertForbidden();
    $this->actingAs($this->passenger)->getJson('/messages/'.$stranger->id.'/chat')->assertForbidden();
    $this->actingAs($this->passenger)->postJson('/messages/'.$this->passenger->id.'/chat', ['body' => 'hi'])->assertForbidden();

    // A driver can't start a chat with a passenger who never wrote to them.
    $this->actingAs($this->driver)->postJson('/messages/'.$this->passenger->id.'/chat', ['body' => 'hi'])->assertForbidden();

    $this->actingAs($this->passenger)->postJson('/messages/'.$this->driver->id.'/chat', ['body' => '   '])->assertStatus(422);
    $this->actingAs($this->passenger)->postJson('/messages/'.$this->driver->id.'/chat', ['body' => str_repeat('a', 501)])->assertStatus(422);
});

it('lists my conversations with unread counts and requires login', function () {
    DirectMessage::create(['sender_id' => $this->passenger->id, 'recipient_id' => $this->driver->id, 'body' => 'Hello']);

    $this->actingAs($this->driver)->get('/messages')->assertOk()
        ->assertInertia(fn ($page) => $page->has('conversations', 1)->where('conversations.0.unread', 1));
    $this->actingAs($this->driver)->get('/messages/'.$this->passenger->id)->assertOk();
    $this->actingAs($this->driver)->get('/messages')
        ->assertInertia(fn ($page) => $page->where('conversations.0.unread', 0));

    auth()->logout();
    $this->get('/messages')->assertRedirect('/login');
});

it('shows Sent, then Delivered when they come online, then Seen when they open the chat', function () {
    $send = fn ($body) => $this->actingAs($this->passenger)->postJson('/messages/'.$this->driver->id.'/chat', ['body' => $body]);
    $statuses = fn () => $this->actingAs($this->passenger)->getJson('/messages/'.$this->driver->id.'/chat?after=999999')->json();

    // The driver is offline: the message is only "sent".
    $first = $send('Hello')->assertCreated()->assertJsonPath('message.status', 'sent')->json('message.id');
    expect($statuses()['partner']['online'])->toBeFalse();

    // The driver opens the site (any page / heartbeat): it is now "delivered", and they show as online.
    \Illuminate\Support\Facades\Cache::flush();
    $this->actingAs($this->driver)->postJson('/presence')->assertNoContent();
    $after = $statuses();
    expect($after['statuses'][$first])->toBe('delivered')->and($after['partner']['online'])->toBeTrue();

    // A message sent while they are online is delivered straight away.
    $second = $send('Are you there?')->assertCreated()->assertJsonPath('message.status', 'delivered')->json('message.id');

    // They open the chat: both become "seen".
    $this->actingAs($this->driver)->getJson('/messages/'.$this->passenger->id.'/chat')->assertOk();
    expect($statuses()['statuses'])->toMatchArray([$first => 'seen', $second => 'seen']);

    // Only my own messages carry a status; the other person's do not.
    $this->actingAs($this->driver)->postJson('/messages/'.$this->passenger->id.'/chat', ['body' => 'Yes!'])->assertCreated();
    $theirs = $this->actingAs($this->passenger)->getJson('/messages/'.$this->driver->id.'/chat?after='.$second)->json('messages.0');
    expect($theirs['mine'])->toBeFalse()->and($theirs['status'])->toBeNull();
});
