<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\RideStatus;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reservation -> pending booking.
 *
 * Everything that must be true for a seat to be taken is checked HERE, inside one
 * database transaction that locks the ride row, so two passengers can't grab the
 * last seat together. The matching payment row (pending, cash on ride) is created
 * in the same transaction so a booking never exists without its money record.
 */
class ReserveSeat
{
    /**
     * @param  array<string, mixed>  $details  contact + pick-up/return fields from the booking form
     */
    public function handle(User $passenger, Ride $ride, int $seats = 1, array $details = []): Booking
    {
        if (Setting::bool('require_id_for_booking') && ! $passenger->hasApprovedId()) {
            $this->fail('id', 'Upload a valid ID and wait for approval before booking.');
        }

        $booking = DB::transaction(function () use ($passenger, $ride, $seats, $details) {
            $locked = Ride::with('vehicle')->whereKey($ride->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== RideStatus::Open || $locked->departure_at->isPast() || $locked->started_at) {
                $this->fail('ride', 'This ride is no longer open for booking.');
            }

            if ($locked->vehicle->driver_id === $passenger->id) {
                $this->fail('ride', "You can't book your own ride.");
            }

            // A cancelled booking frees the seat but the (ride, passenger) pair stays unique in the DB,
            // so a passenger who cancelled can't rebook the same ride. Tell them clearly.
            if ($locked->bookings()->where('passenger_id', $passenger->id)->exists()) {
                $this->fail('ride', 'You already have a booking for this ride.');
            }

            $taken = (int) $locked->bookings()
                ->where('status', '!=', BookingStatus::Cancelled->value)
                ->sum('seats_booked');

            if ($seats < 1 || $taken + $seats > $locked->seats_offered) {
                $this->fail('seats', 'Not enough seats left on this ride.');
            }

            $booking = Booking::create($details + [
                'reference_no' => Booking::generateReference(),
                'ride_id' => $locked->id,
                'passenger_id' => $passenger->id,
                'seats_booked' => $seats,
                'fare_per_seat' => $locked->price_per_seat, // price snapshot
                'status' => BookingStatus::Pending,
            ]);

            // Money snapshot: fare x seats, split into platform fee and driver earnings.
            Payment::create([
                'booking_id' => $booking->id,
                'method' => 'cash',
                'status' => PaymentStatus::Pending,
            ] + Payment::split((float) $locked->price_per_seat * $seats, Setting::float('platform_fee_percent')));

            return $booking;
        });

        // Tell the driver (after commit, so a failed notification can't undo the booking).
        $driver = $ride->loadMissing('vehicle.driver.user')->vehicle->driver->user;
        $driver->notify(new AppNotice(
            'New seat request',
            "{$passenger->name} requested {$seats} seat(s) on {$ride->departure_at->format('M j, g:i A')}.",
            "/bookings/{$booking->id}",
        ));

        return $booking;
    }

    private function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([$key => $message]);
    }
}
