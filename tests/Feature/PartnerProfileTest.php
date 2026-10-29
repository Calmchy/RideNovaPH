<?php

use App\Models\Booking;
use Tests\Support\Scenario;

// Passenger and driver see each other's safe profile on the booking page, and nobody else does.

beforeEach(fn () => Scenario::lookups());

function bookingBetween($passenger, $driver): Booking
{
    $ride = Scenario::ride($driver);
    test()->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm())->assertSessionHasNoErrors();

    return Booking::where('passenger_id', $passenger->id)->firstOrFail();
}

test('the passenger sees the driver profile and the driver sees the passenger profile', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $booking = bookingBetween($passenger, $driver);

    $this->actingAs($passenger)->get("/bookings/{$booking->id}")
        ->assertInertia(fn ($page) => $page
            ->where('partner.role', 'driver')
            ->where('partner.name', $driver->name)
            ->has('partner.vehicle.plate_number'));

    $this->actingAs($driver)->get("/bookings/{$booking->id}")
        ->assertInertia(fn ($page) => $page
            ->where('partner.role', 'passenger')
            ->where('partner.name', $passenger->name)
            ->where('partner.vehicle', null));
});

test('the profile never leaks email, address or ID details', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $booking = bookingBetween($passenger, $driver);

    $partner = $this->actingAs($passenger)->get("/bookings/{$booking->id}")
        ->viewData('page')['props']['partner'];

    expect($partner)->not->toHaveKeys(['email', 'address', 'emergency_contact_phone', 'license_number', 'license_image_path']);
});

test('the phone number stays hidden until the driver approves', function () {
    $driver = Scenario::driver();
    $driver->forceFill(['phone_number' => '09179998888'])->save();
    $passenger = Scenario::passenger();
    $booking = bookingBetween($passenger, $driver);

    $this->actingAs($passenger)->get("/bookings/{$booking->id}")
        ->assertInertia(fn ($page) => $page->where('partner.phone', null));

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/approve")->assertRedirect();

    $this->actingAs($passenger)->get("/bookings/{$booking->id}")
        ->assertInertia(fn ($page) => $page->where('partner.phone', '09179998888'));
});

test('a stranger cannot open the booking, so cannot see the profile', function () {
    $booking = bookingBetween(Scenario::passenger(), Scenario::driver());

    $this->actingAs(Scenario::passenger())->get("/bookings/{$booking->id}")->assertForbidden();
});
