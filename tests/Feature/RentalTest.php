<?php

use App\Enums\RentalStatus;
use App\Models\RentalRequest;
use Tests\Support\Scenario;

// Self-drive rental: owner sets the daily rate, renter sends details + when/where, owner approves.

beforeEach(fn () => Scenario::lookups());

function rentableCar(float $rate = 1500): array
{
    $owner = Scenario::driver();
    $owner->forceFill(['phone_number' => '09175554444'])->save();
    $vehicle = Scenario::vehicle($owner, 5);
    $vehicle->forceFill(['available_for_rent' => true, 'daily_rate' => $rate])->save();

    return [$owner, $vehicle];
}

function rentalForm($vehicle, array $over = []): array
{
    return $over + [
        'vehicle_id' => $vehicle->id,
        'renter_name' => 'Juan Dela Cruz', 'renter_phone' => '09171234567', 'renter_address' => 'Abuyog, Leyte',
        'license_number' => 'N01-23-456789', 'license_expiry' => now()->addYears(2)->format('Y-m-d'),
        'start_at' => now()->addDays(3)->format('Y-m-d\TH:i'),
        'end_at' => now()->addDays(5)->format('Y-m-d\TH:i'),
        'pickup_location' => 'Abuyog plaza', 'return_location' => 'Abuyog plaza',
        'purpose' => 'Family trip',
    ];
}

function openRental(): array
{
    [$owner, $vehicle] = rentableCar();
    $renter = Scenario::passenger();
    test()->actingAs($renter)->post('/rentals', rentalForm($vehicle))->assertSessionHasNoErrors();

    return [$owner, $renter, RentalRequest::firstOrFail()];
}

test('a verified renter can request a vehicle; price is rate x days and the owner is notified', function () {
    [$owner, $renter, $rental] = openRental();

    expect($rental->status)->toBe(RentalStatus::Pending)
        ->and($rental->days)->toBe(2)
        ->and((float) $rental->daily_rate)->toBe(1500.0)
        ->and((float) $rental->total_price)->toBe(3000.0)
        ->and($rental->license_number)->toBe('N01-23-456789')
        ->and($owner->notifications()->count())->toBe(1);

    // The licence number is encrypted at rest (the raw column is not the plain text).
    expect(\Illuminate\Support\Facades\DB::table('rental_requests')->value('license_number'))->not->toBe('N01-23-456789');
});

test('the renter cannot choose the price, only the owner rate counts', function () {
    [, $vehicle] = rentableCar(2000);

    $this->actingAs(Scenario::passenger())->post('/rentals', rentalForm($vehicle, ['total_price' => 1, 'daily_rate' => 1]));

    expect((float) RentalRequest::firstOrFail()->total_price)->toBe(4000.0);
});

test('only the owner can switch a vehicle on and set the daily rate', function () {
    $owner = Scenario::driver();
    $vehicle = Scenario::vehicle($owner, 4);
    $other = Scenario::driver();

    $this->actingAs($other)->patch("/rentals/vehicles/{$vehicle->id}", ['available_for_rent' => true, 'daily_rate' => 1])->assertForbidden();
    $this->actingAs(Scenario::passenger())->patch("/rentals/vehicles/{$vehicle->id}", ['available_for_rent' => true, 'daily_rate' => 1])->assertForbidden();

    $this->actingAs($owner)->patch("/rentals/vehicles/{$vehicle->id}", ['available_for_rent' => true, 'daily_rate' => 1800])->assertSessionHasNoErrors();
    expect((float) $vehicle->fresh()->daily_rate)->toBe(1800.0)->and((bool) $vehicle->fresh()->available_for_rent)->toBeTrue();

    // Rate is required when switching on, and must be sane.
    $this->actingAs($owner)->patch("/rentals/vehicles/{$vehicle->id}", ['available_for_rent' => true, 'daily_rate' => null])->assertSessionHasErrors('daily_rate');
    $this->actingAs($owner)->patch("/rentals/vehicles/{$vehicle->id}", ['available_for_rent' => true, 'daily_rate' => 99999999])->assertSessionHasErrors('daily_rate');
});

test('a vehicle that is not for rent, or my own, cannot be requested', function () {
    $owner = Scenario::driver();
    $off = Scenario::vehicle($owner, 4);
    $renter = Scenario::passenger();

    $this->actingAs($renter)->post('/rentals', rentalForm($off))->assertSessionHasErrors('vehicle_id');

    [$owner2, $mine] = rentableCar();
    $this->actingAs($owner2)->post('/rentals', rentalForm($mine))->assertSessionHasErrors('vehicle_id');

    expect(RentalRequest::count())->toBe(0);
});

test('renter details are required and the licence must outlast the rental', function () {
    [, $vehicle] = rentableCar();
    $renter = Scenario::passenger();

    $this->actingAs($renter)->post('/rentals', rentalForm($vehicle, ['renter_name' => '', 'license_number' => '']))
        ->assertSessionHasErrors(['renter_name', 'license_number']);

    $this->actingAs($renter)->post('/rentals', rentalForm($vehicle, ['license_expiry' => now()->addDay()->format('Y-m-d')]))
        ->assertSessionHasErrors('license_expiry');
});

test('a renter without an approved ID cannot rent', function () {
    [, $vehicle] = rentableCar();

    $this->actingAs(Scenario::passenger(idApproved: false))->post('/rentals', rentalForm($vehicle))->assertSessionHasErrors('vehicle_id');
});

test('the owner approves, and two approved rentals can never overlap', function () {
    [$owner, $renter, $rental] = openRental();
    $second = Scenario::passenger();
    $this->actingAs($second)->post('/rentals', rentalForm($rental->vehicle, ['start_at' => now()->addDays(4)->format('Y-m-d\TH:i'), 'end_at' => now()->addDays(6)->format('Y-m-d\TH:i')]))
        ->assertSessionHasNoErrors();
    $other = RentalRequest::where('renter_id', $second->id)->firstOrFail();

    // The renter can't approve their own request.
    $this->actingAs($renter)->patch("/rentals/{$rental->id}/approve")->assertForbidden();

    $this->actingAs($owner)->patch("/rentals/{$rental->id}/approve")->assertSessionHasNoErrors();
    expect($rental->fresh()->status)->toBe(RentalStatus::Approved)->and($renter->notifications()->count())->toBe(1);

    // The overlapping second request can't be approved now.
    $this->actingAs($owner)->patch("/rentals/{$other->id}/approve")->assertSessionHasErrors('status');
    expect($other->fresh()->status)->toBe(RentalStatus::Pending);

    // And nobody can newly request the reserved dates.
    $this->actingAs(Scenario::passenger())->post('/rentals', rentalForm($rental->vehicle))->assertSessionHasErrors('start_at');
});

test('declining and cancelling need a reason; strangers cannot see or touch a rental', function () {
    [$owner, $renter, $rental] = openRental();
    $stranger = Scenario::passenger();

    $this->actingAs($stranger)->get("/rentals/{$rental->id}")->assertForbidden();
    $this->actingAs($stranger)->patch("/rentals/{$rental->id}/cancel", ['reason' => 'because I can'])->assertForbidden();

    $this->actingAs($owner)->patch("/rentals/{$rental->id}/decline", ['reason' => 'no'])->assertSessionHasErrors('reason');
    $this->actingAs($owner)->patch("/rentals/{$rental->id}/decline", ['reason' => 'Vehicle is in the shop'])->assertSessionHasNoErrors();

    expect($rental->fresh()->status)->toBe(RentalStatus::Declined)->and($rental->fresh()->reason)->toBe('Vehicle is in the shop');

    // A closed request can't be reopened.
    $this->actingAs($renter)->patch("/rentals/{$rental->id}/cancel", ['reason' => 'changed my mind'])->assertSessionHasErrors('status');
});

test('the owner cannot mark a rental returned before it starts', function () {
    [$owner, , $rental] = openRental();
    $this->actingAs($owner)->patch("/rentals/{$rental->id}/approve");

    $this->actingAs($owner)->patch("/rentals/{$rental->id}/complete")->assertSessionHasErrors('status');

    $rental->forceFill(['start_at' => now()->subDay(), 'end_at' => now()->addDay()])->save();
    $this->actingAs($owner)->patch("/rentals/{$rental->id}/complete")->assertSessionHasNoErrors();
    expect($rental->fresh()->status)->toBe(RentalStatus::Completed);
});

test('the owner phone is hidden from the renter until approved; the pages render', function () {
    $this->withoutVite();
    [$owner, $renter, $rental] = openRental();

    $before = $this->actingAs($renter)->get("/rentals/{$rental->id}")->assertOk()->viewData('page')['props'];
    expect($before['partner']['phone'])->toBeNull();

    $this->actingAs($owner)->patch("/rentals/{$rental->id}/approve");
    $after = $this->actingAs($renter)->get("/rentals/{$rental->id}")->assertOk()->viewData('page')['props'];
    expect($after['partner']['phone'])->toBe('09175554444');

    // Rentals live on the "Hire a driver" page; the old /rentals URL just redirects there.
    $this->actingAs($renter)->get('/rentals')->assertRedirect('/charters');
    $this->actingAs($renter)->get('/charters')->assertOk();
    $this->actingAs($owner)->get('/charters')->assertOk();
    $this->actingAs($renter)->get('/rentals/new?vehicle='.$rental->vehicle_id)->assertOk();
});

test('guests are sent to log in', function () {
    $this->get('/rentals')->assertRedirect('/login');
});

test('a driver who only rents out the vehicle still shows in the banner, with the rent option and rate', function () {
    $this->withoutVite();
    [$owner, $vehicle] = rentableCar(1700);
    $owner->driverProfile->forceFill(['available_for_hire' => false])->save();

    $drivers = collect($this->actingAs(Scenario::passenger())->get('/charters')->assertOk()->viewData('page')['props']['drivers']);
    $entry = $drivers->firstWhere('id', $owner->id);

    expect($entry)->not->toBeNull()
        ->and($entry['can_hire'])->toBeFalse()
        ->and($entry['rentals'][0]['id'])->toBe($vehicle->id)
        ->and((float) $entry['rentals'][0]['daily_rate'])->toBe(1700.0);
});
