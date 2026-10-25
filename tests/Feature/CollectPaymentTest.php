<?php

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use Tests\Support\Scenario;

// The driver's "Mark as paid" button: who may press it, when, and what it records.

beforeEach(fn () => Scenario::lookups());

function approvedBooking(): array
{
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $ride = Scenario::ride($driver);
    test()->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm())->assertSessionHasNoErrors();
    $booking = Booking::where('passenger_id', $passenger->id)->firstOrFail();
    test()->actingAs($driver)->patch("/bookings/{$booking->id}/approve");

    return [$driver, $passenger, $booking->fresh()];
}

test('the driver can mark a booking paid: receipt issued and BOTH sides are notified', function () {
    [$driver, $passenger, $booking] = approvedBooking();
    $driverBefore = $driver->notifications()->count();
    $passengerBefore = $passenger->notifications()->count();

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/paid")->assertSessionHasNoErrors();

    $payment = $booking->fresh()->payment;
    expect($payment->status)->toBe(PaymentStatus::Paid)
        ->and($payment->method)->toBe('cash')
        ->and($payment->receipt_no)->toStartWith('RCPT-')
        ->and($payment->paid_at)->not->toBeNull()
        ->and($passenger->notifications()->count())->toBe($passengerBefore + 1)
        ->and($driver->notifications()->count())->toBe($driverBefore + 1);
});

test('the passenger cannot mark their own booking as paid', function () {
    [, $passenger, $booking] = approvedBooking();

    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/paid")->assertForbidden();
});

test('a pending request cannot be marked paid, and a payment is only recorded once', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $ride = Scenario::ride($driver);
    $this->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm());
    $booking = Booking::where('passenger_id', $passenger->id)->firstOrFail();

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/paid")->assertSessionHasErrors('status');

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/approve");
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/paid")->assertSessionHasNoErrors();
    $receipt = $booking->fresh()->payment->receipt_no;

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/paid")->assertSessionHasErrors('status');
    expect($booking->fresh()->payment->receipt_no)->toBe($receipt);
});

test('once paid, neither the passenger nor the driver can cancel, and the button is hidden', function () {
    [$driver, $passenger, $booking] = approvedBooking();
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/paid")->assertSessionHasNoErrors();

    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'changed my mind'])->assertSessionHasErrors('status');
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'taking another job'])->assertSessionHasErrors('status');
    expect($booking->fresh()->status)->not->toBe(BookingStatus::Cancelled);

    $this->actingAs($passenger)->get("/bookings/{$booking->id}")->assertInertia(fn ($p) => $p->where('abilities.cancel', false));
});

test('the driver cannot cancel the whole ride while a passenger has paid', function () {
    [$driver, , $booking] = approvedBooking();
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/paid");

    $this->actingAs($driver)->patch("/driver/rides/{$booking->ride_id}/cancel", ['reason' => 'changed plans'])->assertSessionHasErrors('trip');
    expect($booking->fresh()->status)->not->toBe(BookingStatus::Cancelled);
});

test('an admin can still cancel a paid booking (then refund it)', function () {
    [$driver, , $booking] = approvedBooking();
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/paid");

    $this->actingAs(Scenario::admin())->patch("/admin/bookings/{$booking->id}/cancel", ['reason' => 'dispute resolved'])->assertSessionHasNoErrors();
    expect($booking->fresh()->status)->toBe(BookingStatus::Cancelled);
});
