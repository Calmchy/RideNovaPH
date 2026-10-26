<?php

use App\Enums\CharterStatus;
use App\Models\CharterRequest;
use App\Models\Setting;
use Tests\Support\Scenario;

// Group charter: passenger sends terms, DRIVER names the price, passenger accepts, both can chat.

beforeEach(fn () => Scenario::lookups());

function hireDriver(int $seats = 6): array
{
    $driver = Scenario::driver();
    $driver->forceFill(['phone_number' => '09181112222'])->save();
    $vehicle = Scenario::vehicle($driver, $seats);

    return [$driver, $vehicle];
}

function charterForm($driver, $vehicle, array $over = []): array
{
    return $over + [
        'driver_id' => $driver->id, 'vehicle_id' => $vehicle->id, 'group_size' => 4,
        'pickup_location' => 'Abuyog plaza', 'dropoff_location' => 'Tacloban City hall',
        'pickup_at' => now()->addDays(5)->format('Y-m-d\TH:i'),
        'description' => 'Family reunion, two large bags.',
    ];
}

function openCharter(): array
{
    [$driver, $vehicle] = hireDriver();
    $passenger = Scenario::passenger();
    test()->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle))->assertSessionHasNoErrors();

    return [$driver, $passenger, CharterRequest::firstOrFail()];
}

test('the available-drivers banner lists drivers with their phone, but not me, hidden or vehicle-less drivers', function () {
    [$listed] = hireDriver();
    [$hidden] = hireDriver();
    $hidden->driverProfile->forceFill(['available_for_hire' => false])->save();
    $noCar = Scenario::driver();
    $me = Scenario::passenger();

    $drivers = collect($this->actingAs($me)->get('/charters')->viewData('page')['props']['drivers']);

    expect($drivers->pluck('id'))->toContain($listed->id)
        ->not->toContain($hidden->id)->not->toContain($noCar->id)
        ->and($drivers->firstWhere('id', $listed->id)['phone'])->toBe('09181112222');
});

test('a verified passenger can send a group request and the driver is notified', function () {
    [$driver, $vehicle] = hireDriver();
    $passenger = Scenario::passenger();

    $this->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle, ['quoted_price' => 1]))->assertSessionHasNoErrors();

    $c = CharterRequest::firstOrFail();
    expect($c->status)->toBe(CharterStatus::Pending)
        ->and($c->reference_no)->toStartWith('CHR-')
        ->and($c->quoted_price)->toBeNull()          // the passenger can't set the price
        ->and($driver->notifications()->count())->toBe(1);
});

test('the form rules: capacity, return pair, future time, vehicle ownership, ID, availability', function () {
    [$driver, $vehicle] = hireDriver(4);
    [, $otherVehicle] = hireDriver();
    $passenger = Scenario::passenger();

    $this->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle, ['group_size' => 5]))->assertSessionHasErrors('group_size');
    $this->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle, ['return_at' => now()->addDays(6)->format('Y-m-d\TH:i')]))->assertSessionHasErrors('return_location');
    $this->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle, ['pickup_at' => now()->subDay()->format('Y-m-d\TH:i')]))->assertSessionHasErrors('pickup_at');
    $this->actingAs($passenger)->post('/charters', charterForm($driver, $otherVehicle))->assertSessionHasErrors('vehicle_id');
    $this->actingAs(Scenario::passenger(false))->post('/charters', charterForm($driver, $vehicle))->assertSessionHasErrors('driver_id');

    $driver->driverProfile->forceFill(['available_for_hire' => false])->save();
    $this->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle))->assertSessionHasErrors('driver_id');
    expect(CharterRequest::count())->toBe(0);
});

test('no hiring yourself, no second open request with the same driver, and a cap on open requests', function () {
    [$driver, $vehicle] = hireDriver();
    $this->actingAs($driver)->post('/charters', charterForm($driver, $vehicle))->assertSessionHasErrors('driver_id');

    $passenger = Scenario::passenger();
    $this->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle))->assertSessionHasNoErrors();
    $this->actingAs($passenger)->post('/charters', charterForm($driver, $vehicle))->assertSessionHasErrors('driver_id');

    Setting::put('max_open_charters', '1');
    [$d2, $v2] = hireDriver();
    $this->actingAs($passenger)->post('/charters', charterForm($d2, $v2))->assertSessionHasErrors('driver_id');
});

test('the driver quotes, the passenger accepts, and each side is notified; wrong person gets 403', function () {
    [$driver, $passenger, $c] = openCharter();
    $passenger->notifications()->delete();

    $this->actingAs($passenger)->patch("/charters/{$c->id}/quote", ['price' => 100])->assertForbidden();
    $this->actingAs($driver)->patch("/charters/{$c->id}/accept")->assertForbidden();

    $this->actingAs($driver)->patch("/charters/{$c->id}/quote", ['price' => 3500, 'note' => 'Fuel included'])->assertSessionHasNoErrors();
    expect($c->fresh()->status)->toBe(CharterStatus::Quoted)
        ->and((float) $c->fresh()->quoted_price)->toBe(3500.0)
        ->and($passenger->notifications()->count())->toBe(1);

    $driver->notifications()->delete();
    $this->actingAs($passenger)->patch("/charters/{$c->id}/accept")->assertSessionHasNoErrors();
    expect($c->fresh()->status)->toBe(CharterStatus::Accepted)
        ->and($driver->notifications()->count())->toBe(1);
});

test('price must be sensible, and decline/cancel need a reason', function () {
    [$driver, $passenger, $c] = openCharter();

    $this->actingAs($driver)->patch("/charters/{$c->id}/quote", ['price' => 0])->assertSessionHasErrors('price');
    $this->actingAs($driver)->patch("/charters/{$c->id}/quote", ['price' => 999999])->assertSessionHasErrors('price');
    $this->actingAs($driver)->patch("/charters/{$c->id}/decline", ['reason' => 'no'])->assertSessionHasErrors('reason');
    $this->actingAs($passenger)->patch("/charters/{$c->id}/cancel", [])->assertSessionHasErrors('reason');

    $this->actingAs($driver)->patch("/charters/{$c->id}/decline", ['reason' => 'Already booked that day'])->assertSessionHasNoErrors();
    expect($c->fresh()->status)->toBe(CharterStatus::Declined);

    // a closed request can't be quoted or accepted any more
    $this->actingAs($driver)->patch("/charters/{$c->id}/quote", ['price' => 2000])->assertSessionHasErrors('status');
});

test('a trip can only be completed after the pick-up time', function () {
    [$driver, $passenger, $c] = openCharter();
    $this->actingAs($driver)->patch("/charters/{$c->id}/quote", ['price' => 3000]);
    $this->actingAs($passenger)->patch("/charters/{$c->id}/accept");

    $this->actingAs($driver)->patch("/charters/{$c->id}/complete")->assertSessionHasErrors('status');

    $c->forceFill(['pickup_at' => now()->subHour()])->save();
    $this->actingAs($driver)->patch("/charters/{$c->id}/complete")->assertSessionHasNoErrors();
    expect($c->fresh()->status)->toBe(CharterStatus::Completed);
});

test('only the two people involved can open a request or read its chat', function () {
    [, , $c] = openCharter();
    $stranger = Scenario::passenger();

    $this->actingAs($stranger)->get("/charters/{$c->id}")->assertForbidden();
    $this->actingAs($stranger)->getJson("/charters/{$c->id}/messages")->assertForbidden();
    $this->actingAs($stranger)->postJson("/charters/{$c->id}/messages", ['body' => 'hi'])->assertForbidden();
});

test('chat: messages are stored, tags stripped, polled, and the other side is notified on a change of speaker only', function () {
    [$driver, $passenger, $c] = openCharter();
    $driver->notifications()->delete();

    $first = $this->actingAs($passenger)->postJson("/charters/{$c->id}/messages", ['body' => '<b>Hello</b> driver'])->assertCreated();
    expect($first->json('message.body'))->toBe('Hello driver');
    $this->actingAs($passenger)->postJson("/charters/{$c->id}/messages", ['body' => 'Second message'])->assertCreated();
    expect($driver->notifications()->count())->toBe(1);   // one notification, not one per message

    $poll = $this->actingAs($driver)->getJson("/charters/{$c->id}/messages?after=0")->assertOk()->json('messages');
    expect($poll)->toHaveCount(2)->and($poll[0]['mine'])->toBeFalse();

    $this->actingAs($driver)->postJson("/charters/{$c->id}/messages", ['body' => ''])->assertStatus(422);
    $this->actingAs($driver)->postJson("/charters/{$c->id}/messages", ['body' => str_repeat('a', 501)])->assertStatus(422);
});

test('the chat closes once the request is declined or cancelled', function () {
    [$driver, $passenger, $c] = openCharter();
    $this->actingAs($passenger)->patch("/charters/{$c->id}/cancel", ['reason' => 'Plans changed']);

    $this->actingAs($driver)->postJson("/charters/{$c->id}/messages", ['body' => 'hello?'])->assertStatus(422);
});

test('a driver can switch their hire listing off and on', function () {
    [$driver] = hireDriver();

    $this->actingAs($driver)->patch('/driver/availability')->assertRedirect();
    expect($driver->driverProfile->fresh()->available_for_hire)->toBeFalse();

    $this->actingAs($driver)->patch('/driver/availability');
    expect($driver->driverProfile->fresh()->available_for_hire)->toBeTrue();
});
