<?php

use App\Models\Booking;
use App\Models\LiveLocation;
use Tests\Support\Scenario;

// Live GPS tracking: who may share, who may see, arrival detection, notifications and privacy clean-up.

beforeEach(fn () => Scenario::lookups());

// Pick-up pin in Abuyog (10.7438, 125.0117). The ride leaves in 1 hour, inside the 2 h tracking window.
const PICKUP = ['pickup_lat' => 10.7438, 'pickup_lng' => 125.0117];

/** A CONFIRMED booking on a ride that departs soon. Returns [driver, passenger, ride, booking]. */
function confirmedTrip(int $departInHours = 1): array
{
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $ride = Scenario::ride($driver, ['departure_at' => now()->addHours($departInHours)]);

    test()->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm(PICKUP))->assertSessionHasNoErrors();
    $booking = Booking::firstOrFail();
    test()->actingAs($driver)->patch("/bookings/{$booking->id}/approve")->assertSessionHasNoErrors();
    test()->actingAs($passenger)->patch("/bookings/{$booking->id}/confirm")->assertSessionHasNoErrors();

    return [$driver, $passenger, $ride, $booking->fresh()];
}

test('the driver shares a position and the passenger sees it with distance and ETA', function () {
    [$driver, $passenger, $ride, $booking] = confirmedTrip();

    // ~3 km from the pick-up.
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.77, 'lng' => 125.0117, 'speed_kmh' => 40])->assertOk();

    $json = $this->actingAs($passenger)->getJson("/bookings/{$booking->id}/tracking")->assertOk()->json();

    expect($json['role'])->toBe('passenger')
        ->and($json['window_open'])->toBeTrue()
        ->and($json['driver']['lat'])->toBe(10.77)
        ->and($json['driver']['online'])->toBeTrue()
        ->and($json['passenger'])->toBeNull() // a passenger never receives their own / other passengers' data
        ->and($json['metrics']['estimated'])->toBeFalse()
        ->and($json['metrics']['to_pickup_km'])->toBeGreaterThan(2.0)->toBeLessThan(4.0)
        ->and($json['metrics']['to_pickup_min'])->toBeGreaterThan(0)
        ->and($json['metrics']['to_destination_km'])->toBeGreaterThan(20);
});

test('the driver sees the passenger position but never the other way round', function () {
    [$driver, $passenger, $ride, $booking] = confirmedTrip();

    $this->actingAs($passenger)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.7440, 'lng' => 125.0120])->assertOk();

    $json = $this->actingAs($driver)->getJson("/bookings/{$booking->id}/tracking")->assertOk()->json();

    expect($json['role'])->toBe('driver')->and($json['passenger']['lat'])->toBe(10.744)->and($json['driver'])->toBeNull();
});

test('strangers cannot read or send positions', function () {
    [, , $ride, $booking] = confirmedTrip();
    $stranger = Scenario::passenger();

    $this->actingAs($stranger)->getJson("/bookings/{$booking->id}/tracking")->assertForbidden();
    $this->actingAs($stranger)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.7, 'lng' => 125.0])->assertForbidden();
    $this->getJson("/bookings/{$booking->id}/tracking")->assertUnauthorized();
});

test('coordinates are validated', function () {
    [$driver, , $ride] = confirmedTrip();

    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 123, 'lng' => 125.0])->assertUnprocessable();
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 'abc', 'lng' => 125.0])->assertUnprocessable();
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.7, 'lng' => 125.0, 'speed_kmh' => 9999])->assertUnprocessable();
    expect(LiveLocation::count())->toBe(0);
});

test('nothing is shared before the tracking window opens', function () {
    [$driver, $passenger, $ride, $booking] = confirmedTrip(departInHours: 72);

    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.7, 'lng' => 125.0])->assertUnprocessable();
    expect(LiveLocation::count())->toBe(0);

    $json = $this->actingAs($passenger)->getJson("/bookings/{$booking->id}/tracking")->assertOk()->json();
    expect($json['window_open'])->toBeFalse()->and($json['driver'])->toBeNull();
});

test('only a confirmed passenger can share; a merely pending one cannot', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $ride = Scenario::ride($driver, ['departure_at' => now()->addHour()]);
    $this->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm(PICKUP));

    $this->actingAs($passenger)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.7, 'lng' => 125.0])->assertForbidden();
});

test('driver arriving within 150 m of the pin marks arrival once and notifies the passenger', function () {
    [$driver, $passenger, $ride, $booking] = confirmedTrip();

    // 3 km away: not arrived.
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.77, 'lng' => 125.0117])->assertOk()->assertJson(['arrived' => []]);
    expect($booking->fresh()->driver_arrived_at)->toBeNull();

    // ~50 m away: arrived.
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.74385, 'lng' => 125.0117])->assertOk()->assertJson(['arrived' => [$booking->id]]);
    expect($booking->fresh()->driver_arrived_at)->not->toBeNull()
        ->and($passenger->notifications()->where('data->title', 'Your driver has arrived')->count())->toBe(1);

    // Another ping at the same spot must not notify again.
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.74385, 'lng' => 125.0117])->assertOk()->assertJson(['arrived' => []]);
    expect($passenger->notifications()->where('data->title', 'Your driver has arrived')->count())->toBe(1);

    $json = $this->actingAs($passenger)->getJson("/bookings/{$booking->id}/tracking")->json();
    expect($json['arrived'])->toBeTrue()->and($json['metrics']['to_pickup_km'])->toBe(0.0);
});

test('the driver can press "I have arrived"; a passenger cannot', function () {
    [$driver, $passenger, , $booking] = confirmedTrip();

    $this->actingAs($passenger)->postJson("/bookings/{$booking->id}/arrived")->assertForbidden();
    $this->actingAs($driver)->postJson("/bookings/{$booking->id}/arrived")->assertOk();

    expect($booking->fresh()->driver_arrived_at)->not->toBeNull()
        ->and($passenger->notifications()->where('data->title', 'Your driver has arrived')->count())->toBe(1);
});

test('stopping sharing erases my stored position', function () {
    [$driver, , $ride] = confirmedTrip();
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.77, 'lng' => 125.0]);
    expect(LiveLocation::count())->toBe(1);

    $this->actingAs($driver)->deleteJson("/tracking/rides/{$ride->id}/ping")->assertNoContent();

    expect(LiveLocation::count())->toBe(0);
});

test('all stored positions are deleted when the trip is completed', function () {
    [$driver, $passenger, $ride] = confirmedTrip();
    $this->actingAs($driver)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.77, 'lng' => 125.0]);
    $this->actingAs($passenger)->postJson("/tracking/rides/{$ride->id}/ping", ['lat' => 10.74, 'lng' => 125.0]);
    expect(LiveLocation::count())->toBe(2);

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}/start")->assertSessionHasNoErrors();
    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}/complete")->assertSessionHasNoErrors();

    expect(LiveLocation::count())->toBe(0);
});

test('the booking page only offers the live panel while tracking is open', function () {
    [, $passenger, , $booking] = confirmedTrip();

    $this->actingAs($passenger)->get("/bookings/{$booking->id}")
        ->assertInertia(fn ($p) => $p->where('tracking.role', 'passenger')->has('tracking.ride_id'));

    $this->actingAs(Scenario::passenger())->get('/bookings')->assertOk();
});
