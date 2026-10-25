<?php

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Setting;
use Tests\Support\Scenario;

// The whole reservation -> approval -> confirmation -> completion -> receipt story, plus its guard rails.

beforeEach(fn () => Scenario::lookups());

function reserve($passenger, $ride, array $form = []): Booking
{
    test()->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm($form))->assertSessionHasNoErrors();

    return Booking::where('passenger_id', $passenger->id)->firstOrFail();
}

test('a verified passenger can reserve a seat and gets a reference and a pending payment', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $passenger = Scenario::passenger();

    $booking = reserve($passenger, $ride, ['seats' => 2]);

    expect($booking->status)->toBe(BookingStatus::Pending)
        ->and($booking->reference_no)->toMatch('/^RNP-\d{8}-[A-Z0-9]{6}$/')
        ->and($booking->contact_phone)->toBe('09171234567')
        ->and($booking->payment->status)->toBe(PaymentStatus::Pending)
        ->and((float) $booking->payment->amount)->toBe(400.0)
        ->and((float) $booking->payment->platform_fee)->toBe(40.0)       // default fee is 10%
        ->and((float) $booking->payment->driver_earnings)->toBe(360.0);

    expect($driver->notifications()->count())->toBe(1); // "New seat request"
});

test('the platform fee is a snapshot: changing the setting later does not rewrite old payments', function () {
    $ride = Scenario::ride(Scenario::driver());
    $booking = reserve(Scenario::passenger(), $ride);

    Setting::put('platform_fee_percent', '25');

    expect((float) $booking->payment->fresh()->platform_fee)->toBe(20.0);
});

test('a passenger without an approved ID cannot book', function () {
    $ride = Scenario::ride(Scenario::driver());
    $passenger = Scenario::passenger(idApproved: false);

    $this->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm())->assertSessionHasErrors('id');
    expect(Booking::count())->toBe(0);
});

test('you cannot take more seats than are left, or book your own ride', function () {
    $driver = Scenario::driver();
    Scenario::approveId($driver); // the ID check runs first, so the "own ride" rule is only reached with an approved ID
    $ride = Scenario::ride($driver, ['seats_offered' => 2]);

    $this->actingAs(Scenario::passenger())->post("/rides/{$ride->id}/book", Scenario::bookingForm(['seats' => 3]))
        ->assertSessionHasErrors('seats');

    $this->actingAs($driver)->post("/rides/{$ride->id}/book", Scenario::bookingForm())->assertSessionHasErrors('ride');
});

test('the booking form rejects a bad phone number and unticked terms', function () {
    $ride = Scenario::ride(Scenario::driver());

    $this->actingAs(Scenario::passenger())->post("/rides/{$ride->id}/book", Scenario::bookingForm(['contact_phone' => '12345', 'agree' => false]))
        ->assertSessionHasErrors(['contact_phone', 'agree']);
});

test('full lifecycle: approve, confirm, complete issues a receipt and settles the payment', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver, ['departure_at' => now()->subHour()]); // already departed so it can complete
    $passenger = Scenario::passenger();
    // Reserve while the ride is still in the future, then move it into the past.
    $ride->update(['departure_at' => now()->addDays(3)]);
    $booking = reserve($passenger, $ride);
    $ride->update(['departure_at' => now()->subHour()]);

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/approve")->assertSessionHasNoErrors();
    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/confirm")->assertSessionHasNoErrors();
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/complete")->assertSessionHasNoErrors();

    $booking->refresh();
    expect($booking->status)->toBe(BookingStatus::Completed)
        ->and($booking->payment->status)->toBe(PaymentStatus::Paid)
        ->and($booking->payment->receipt_no)->toMatch('/^RCPT-\d{8}-[A-Z0-9]{6}$/');

    $this->actingAs($passenger)->get("/bookings/{$booking->id}/receipt")->assertOk();
});

test('moves must follow the state machine and the right person', function () {
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $booking = reserve($passenger, Scenario::ride($driver));

    // The passenger cannot approve their own request; the driver cannot confirm on their behalf.
    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/approve")->assertForbidden();
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/confirm")->assertForbidden();
    // A pending booking can't jump to completed.
    $this->actingAs($driver)->patch("/bookings/{$booking->id}/complete")->assertSessionHasErrors('status');
    // A stranger can't even open it.
    $this->actingAs(Scenario::passenger())->get("/bookings/{$booking->id}")->assertForbidden();
});

test('cancelling voids the unpaid payment and frees the seat', function () {
    $ride = Scenario::ride(Scenario::driver(), ['seats_offered' => 1]);
    $passenger = Scenario::passenger();
    $booking = reserve($passenger, $ride);

    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'Change of plans'])->assertSessionHasNoErrors();

    expect($booking->fresh()->status)->toBe(BookingStatus::Cancelled)
        ->and($booking->payment->fresh()->status)->toBe(PaymentStatus::Void)
        ->and($ride->fresh()->seatsLeft())->toBe(1);
});

test('passengers cannot cancel inside the cut-off window, but the driver can', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $passenger = Scenario::passenger();
    $booking = reserve($passenger, $ride);
    $ride->update(['departure_at' => now()->addMinutes(30)]); // default cut-off is 2 hours

    $this->actingAs($passenger)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'Change of plans'])->assertSessionHasErrors('status');
    expect($booking->fresh()->status)->toBe(BookingStatus::Pending);

    $this->actingAs($driver)->patch("/bookings/{$booking->id}/cancel", ['reason' => 'Car trouble'])->assertSessionHasNoErrors();
    expect($booking->fresh()->status)->toBe(BookingStatus::Cancelled);
});

test('the bookings hub filters by status and reference', function () {
    $passenger = Scenario::passenger();
    $booking = reserve($passenger, Scenario::ride(Scenario::driver()));

    $this->actingAs($passenger)->get('/bookings?tab=mine&q='.$booking->reference_no)->assertOk()
        ->assertInertia(fn ($page) => $page->component('bookings/index')->has('bookings.data', 1));
    $this->actingAs($passenger)->get('/bookings?tab=mine&status=cancelled')->assertOk()
        ->assertInertia(fn ($page) => $page->has('bookings.data', 0));
    $this->actingAs($passenger)->get('/bookings?tab=requests')->assertNotFound(); // passengers have no requests tab
});