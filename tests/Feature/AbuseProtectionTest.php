<?php

use App\Enums\BookingStatus;
use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Setting;
use Tests\Support\Scenario;

// Anti-scam rules: booking limits, cancellation reasons, cancellation fee, cancellation strikes.

beforeEach(fn () => Scenario::lookups());

/** A ride leaving $days days from now (distinct days, so the overlap rule stays out of the way). */
function rideIn(int $days, $driver = null)
{
    return Scenario::ride($driver ?? Scenario::driver(), ['departure_at' => now()->addDays($days)]);
}

function book($passenger, $ride)
{
    return test()->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm());
}

test('a person must give a reason when cancelling', function () {
    $passenger = Scenario::passenger();
    book($passenger, rideIn(3));
    $booking = Booking::firstOrFail();

    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel")->assertSessionHasErrors('reason');
    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'no'])->assertSessionHasErrors('reason');
    expect($booking->fresh()->status)->toBe(BookingStatus::Pending);
});

test('cancelling a pending request is free', function () {
    $passenger = Scenario::passenger();
    book($passenger, rideIn(3));
    $booking = Booking::firstOrFail();

    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'Plans changed'])->assertSessionHasNoErrors();

    expect($booking->payment->fresh()->fee_status)->toBe('none')
        ->and((float) $booking->payment->fresh()->cancellation_fee)->toBe(0.0)
        ->and($booking->fresh()->cancellation_reason)->toBe('Plans changed');
});

test('cancelling after the driver approved charges the fee and blocks new bookings until settled', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    book($passenger, rideIn(3, $driver));
    $booking = Booking::firstOrFail();
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/approve")->assertSessionHasNoErrors();

    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'Found another ride'])->assertSessionHasNoErrors();

    $payment = $booking->payment->fresh();
    // 20% of a P200 fare.
    expect((float) $payment->cancellation_fee)->toBe(40.0)->and($payment->fee_status)->toBe('due');

    // Blocked while the fee is unpaid ...
    book($passenger, rideIn(5))->assertSessionHasErrors('limit');
    expect(ActivityLog::where('action', 'booking.blocked')->exists())->toBeTrue();

    // ... and free again once an admin settles it.
    $this->actingAs(Scenario::admin())->post("/admin/transactions/{$payment->id}/fee", ['decision' => 'paid'])->assertSessionHasNoErrors();
    expect($payment->fresh()->fee_status)->toBe('paid');
    book($passenger, rideIn(5))->assertSessionHasNoErrors();
});

test('a driver cancelling never charges the passenger', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    book($passenger, rideIn(3, $driver));
    $booking = Booking::firstOrFail();
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/approve");

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'Car trouble'])->assertSessionHasNoErrors();

    expect($booking->payment->fresh()->fee_status)->toBe('none');
});

test('one passenger cannot hold more open bookings than the limit', function () {
    Setting::put('max_active_bookings', '2');
    $passenger = Scenario::passenger();

    book($passenger, rideIn(3))->assertSessionHasNoErrors();
    book($passenger, rideIn(5))->assertSessionHasNoErrors();
    book($passenger, rideIn(7))->assertSessionHasErrors('limit');

    expect(Booking::where('passenger_id', $passenger->id)->count())->toBe(2);
});

test('a passenger cannot book two rides that overlap in time', function () {
    $passenger = Scenario::passenger();

    book($passenger, Scenario::ride(Scenario::driver(), ['departure_at' => now()->addDays(3)]))->assertSessionHasNoErrors();
    // 1 hour later: inside the default 3-hour gap.
    book($passenger, Scenario::ride(Scenario::driver(), ['departure_at' => now()->addDays(3)->addHour()]))->assertSessionHasErrors('limit');
    // 5 hours later is fine.
    book($passenger, Scenario::ride(Scenario::driver(), ['departure_at' => now()->addDays(3)->addHours(5)]))->assertSessionHasNoErrors();
});

test('too many recent cancellations pause booking', function () {
    Setting::put('cancel_strike_limit', '2');
    $passenger = Scenario::passenger();

    foreach ([3, 5] as $days) {
        book($passenger, rideIn($days));
        $booking = Booking::where('passenger_id', $passenger->id)->latest('id')->first();
        $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'Changed my mind'])->assertSessionHasNoErrors();
    }

    book($passenger, rideIn(7))->assertSessionHasErrors('limit');
});
