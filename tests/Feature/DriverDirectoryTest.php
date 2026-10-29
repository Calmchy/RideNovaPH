<?php

use App\Models\User;
use Tests\Support\Scenario;

it('lists verified drivers and opens a profile', function () {
    $this->withoutVite();
    Scenario::lookups();
    $driver = Scenario::driver(true);
    Scenario::approveId($driver);
    Scenario::vehicle($driver, 4);
    $passenger = Scenario::passenger(true);

    $this->actingAs($passenger)->get('/drivers')->assertOk();
    $this->actingAs($passenger)->get('/drivers/'.$driver->id)->assertOk();
});

it('404s for someone who is not a verified driver', function () {
    $this->withoutVite();
    Scenario::lookups();
    $passenger = Scenario::passenger(true);
    $other = User::factory()->create();

    $this->actingAs($passenger)->get('/drivers/'.$other->id)->assertNotFound();
});

it('hides a driver whose ID is not approved', function () {
    $this->withoutVite();
    Scenario::lookups();
    $driver = Scenario::driver(true);
    $passenger = Scenario::passenger(true);

    $this->actingAs($passenger)->get('/drivers/'.$driver->id)->assertNotFound();
});

it('requires login', function () {
    $this->get('/drivers')->assertRedirect('/login');
});

it('shows passenger reviews publicly with a shortened name and no HTML', function () {
    $this->withoutVite();
    Scenario::lookups();
    $driver = Scenario::driver(true);
    Scenario::approveId($driver);
    Scenario::vehicle($driver, 4);
    $passenger = Scenario::passenger(true);
    $passenger->forceFill(['name' => 'Juan Dela Cruz'])->save();
    $ride = Scenario::ride($driver);
    $booking = \App\Models\Booking::forceCreate([
        'ride_id' => $ride->id, 'passenger_id' => $passenger->id, 'seats_booked' => 1, 'fare_per_seat' => 100,
        'status' => \App\Enums\BookingStatus::Completed->value,
        'reference_no' => 'RN-TEST-'.random_int(1000, 9999),
    ]);

    $this->actingAs($passenger)->post("/bookings/{$booking->id}/reviews", [
        'rating' => 5, 'comment' => '<b>Great</b> driver',
    ])->assertSessionHasNoErrors();

    $reviews = \App\Support\DriverReviews::for($driver->id);
    expect($reviews)->toHaveCount(1)
        ->and($reviews[0]['reviewer'])->toBe('Juan C.')
        ->and($reviews[0]['comment'])->toBe('Great driver');

    // Public ride page (guest) renders with the reviews.
    $this->get("/rides/{$ride->id}")->assertOk();
});

it('builds the star breakdown and serves the review history pages', function () {
    $this->withoutVite();
    Scenario::lookups();
    $driver = Scenario::driver(true);
    Scenario::approveId($driver);
    $passenger = Scenario::passenger(true);
    $ride = Scenario::ride($driver);
    $booking = \App\Models\Booking::forceCreate([
        'ride_id' => $ride->id, 'passenger_id' => $passenger->id, 'seats_booked' => 1, 'fare_per_seat' => 100,
        'status' => \App\Enums\BookingStatus::Completed->value, 'reference_no' => 'RN-HIST-1',
    ]);
    $booking->reviews()->create(['reviewer_role' => 'passenger', 'rating' => 4, 'comment' => 'Nice']);

    $sum = \App\Support\DriverReviews::summary($driver->id);
    expect($sum['total'])->toBe(1)->and($sum['average'])->toBe(4.0);

    // Public full history (guests allowed) and personal history (login needed).
    $this->get("/drivers/{$driver->id}/reviews")->assertOk();
    $this->get("/drivers/{$driver->id}/reviews?stars=4")->assertOk();
    $this->actingAs($passenger)->get('/reviews')->assertOk();
    $this->actingAs($driver)->get('/reviews')->assertOk();
    $this->get('/reviews')->assertRedirect('/login');
});
