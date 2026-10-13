<?php

use App\Models\Role;
use App\Models\User;
use Tests\Support\Scenario;

beforeEach(fn () => Scenario::lookups());

test('registration can create a passenger or a driver but never an admin', function () {
    $base = ['name' => 'New Person', 'password' => 'Str0ng-Passw0rd!x', 'password_confirmation' => 'Str0ng-Passw0rd!x'];

    $this->post('/register', $base + ['email' => 'd@example.com', 'account_type' => 'driver']);
    expect(User::where('email', 'd@example.com')->first()->role_id)->toBe(Role::DRIVER);
    auth()->logout();

    $this->post('/register', $base + ['email' => 'a@example.com', 'account_type' => 'admin'])->assertSessionHasErrors('account_type');
    expect(User::where('email', 'a@example.com')->exists())->toBeFalse();

    // Mass-assignment attempt: role_id in the body is ignored.
    $this->post('/register', $base + ['email' => 'p@example.com', 'role_id' => Role::ADMIN]);
    expect(User::where('email', 'p@example.com')->first()->role_id)->toBe(Role::PASSENGER);
});

test('a user can edit their profile but cannot change their own role or status', function () {
    $user = Scenario::passenger();

    $this->actingAs($user)->patch('/settings/profile', [
        'name' => 'Renamed', 'email' => $user->email, 'phone_number' => '09171234567', 'address' => 'Abuyog',
        'emergency_contact_name' => 'Mama', 'emergency_contact_phone' => '09181234567',
        'role_id' => Role::ADMIN, 'account_status' => 'suspended',
    ])->assertSessionHasNoErrors();

    $user->refresh();
    expect($user->name)->toBe('Renamed')->and($user->phone_number)->toBe('09171234567')
        ->and($user->role_id)->toBe(Role::PASSENGER)->and($user->isSuspended())->toBeFalse();
});

test('profile validates the phone format', function () {
    $user = Scenario::passenger();

    $this->actingAs($user)->patch('/settings/profile', ['name' => 'X', 'email' => $user->email, 'phone_number' => 'abc'])
        ->assertSessionHasErrors('phone_number');
});

test('driver-only settings save on the driver profile', function () {
    $driver = Scenario::driver();

    $this->actingAs($driver)->patch('/settings/profile', ['name' => 'D', 'email' => $driver->email, 'bio' => 'Safe driver', 'allows_luggage' => false])
        ->assertSessionHasNoErrors();

    expect($driver->driverProfile->fresh()->bio)->toBe('Safe driver')->and($driver->driverProfile->fresh()->allows_luggage)->toBeFalse();
});

test('notifications: a user can open and read only their own', function () {
    $a = Scenario::passenger();
    $b = Scenario::passenger();
    $a->notify(new \App\Notifications\AppNotice('Hello', 'Body', '/bookings'));
    $b->notify(new \App\Notifications\AppNotice('Secret', 'Body', '/bookings'));
    $mine = $a->notifications()->first();
    $theirs = $b->notifications()->first();

    $this->actingAs($a)->get("/notifications/{$mine->id}")->assertRedirect('/bookings');
    expect($mine->fresh()->read_at)->not->toBeNull();
    $this->actingAs($a)->get("/notifications/{$theirs->id}")->assertNotFound();
});

test('notification links can never redirect off-site', function () {
    $a = Scenario::passenger();
    $a->notify(new \App\Notifications\AppNotice('Evil', 'x', '//evil.example.com'));

    $this->actingAs($a)->get('/notifications/'.$a->notifications()->first()->id)->assertRedirect(); // goes back, not to evil.example.com
    expect(session('_previous.url') ?? '')->not->toContain('evil.example.com');
});

test('receipts are private to the participants', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $ride = Scenario::ride($driver);
    $this->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm());
    $booking = $passenger->bookings()->first();
    $booking->payment->forceFill(['status' => 'paid', 'receipt_no' => 'RCPT-1', 'paid_at' => now()])->save();

    $this->actingAs($passenger)->get("/bookings/{$booking->id}/receipt")->assertOk()
        ->assertInertia(fn ($p) => $p->where('receipt.platform_fee', null)); // passengers don't see the fee split
    $this->actingAs($driver)->get("/bookings/{$booking->id}/receipt")->assertOk()
        ->assertInertia(fn ($p) => $p->whereNot('receipt.platform_fee', null));
    $this->actingAs(Scenario::passenger())->get("/bookings/{$booking->id}/receipt")->assertForbidden();
});
