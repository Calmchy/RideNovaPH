<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\RideStatus;
use App\Models\ActivityLog;
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

        try {
            $booking = $this->reserve($passenger, $ride, $seats, $details);
        } catch (ValidationException $e) {
            // Keep a trail of blocked attempts so an admin can spot someone hammering the limits.
            if (array_key_exists('limit', $e->errors())) {
                ActivityLog::record($passenger, 'booking.blocked', null, ['ride_id' => $ride->id, 'why' => $e->errors()['limit'][0]]);
            }

            throw $e;
        }

        // Tell the driver (after commit, so a failed notification can't undo the booking).
        $driver = $ride->loadMissing('vehicle.driver.user')->vehicle->driver->user;
        $driver->notify(new AppNotice(
            'New seat request',
            "{$passenger->name} requested {$seats} seat(s) on {$ride->departure_at->format('M j, g:i A')}.",
            "/bookings/{$booking->id}",
        ));

        return $booking;
    }

    /**
     * Anti-abuse rules (all configurable in Admin > Settings). They stop one account from
     * "holding" many drivers at once, e.g. reserving a lot of rides it never intends to take:
     *   1. unpaid cancellation fee      -> pay it (or have admin waive it) first
     *   2. too many open bookings       -> finish or cancel one first
     *   3. too many recent cancellations-> temporary block
     *   4. overlapping departure times  -> one person can't be in two cars at once
     * Runs inside the transaction with the passenger row locked, so two parallel requests can't both slip through.
     */
    private function assertWithinLimits(User $passenger, Ride $ride): void
    {
        User::whereKey($passenger->id)->lockForUpdate()->first(); // serialise this passenger's bookings

        $unpaidFee = (float) Payment::where('fee_status', 'due')
            ->whereHas('booking', fn ($q) => $q->where('passenger_id', $passenger->id))->sum('cancellation_fee');
        if ($unpaidFee > 0) {
            $this->fail('limit', 'You have an unpaid cancellation fee of ₱'.number_format($unpaidFee, 2).'. Settle it with support before booking again.');
        }

        $open = Booking::where('passenger_id', $passenger->id)
            ->whereIn('status', [BookingStatus::Pending->value, BookingStatus::Approved->value, BookingStatus::Confirmed->value]);

        $max = Setting::int('max_active_bookings');
        if ($max > 0 && (clone $open)->count() >= $max) {
            $this->fail('limit', "You can hold at most {$max} open bookings at a time. Complete or cancel one first.");
        }

        $days = Setting::int('cancel_strike_days');
        $strikes = Setting::int('cancel_strike_limit');
        if ($strikes > 0 && Booking::where('passenger_id', $passenger->id)
            ->where('status', BookingStatus::Cancelled->value)
            ->where('cancelled_at', '>=', now()->subDays($days))->count() >= $strikes) {
            $this->fail('limit', "Too many cancellations in the last {$days} days. Booking is paused for now. Contact support if this is a mistake.");
        }

        $gap = Setting::int('booking_min_gap_hours');
        if ($gap > 0 && (clone $open)->whereHas('ride', fn ($q) => $q
            ->where('departure_at', '>', $ride->departure_at->copy()->subHours($gap))
            ->where('departure_at', '<', $ride->departure_at->copy()->addHours($gap)))->exists()) {
            $this->fail('limit', "You already have a booking that departs within {$gap} hour(s) of this ride. You can't be in two cars at once.");
        }
    }

    /** The reservation itself: one transaction, ride row locked. */
    private function reserve(User $passenger, Ride $ride, int $seats, array $details): Booking
    {
        return DB::transaction(function () use ($passenger, $ride, $seats, $details) {
            $locked = Ride::with('vehicle')->whereKey($ride->id)->lockForUpdate()->firstOrFail();

            $this->assertWithinLimits($passenger, $locked);

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
    }

    private function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([$key => $message]);
    }
}
