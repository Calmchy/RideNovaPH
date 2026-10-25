<?php

namespace App\Actions\Rides;

use App\Actions\Bookings\TransitionBooking;
use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\RideStatus;
use App\Models\LiveLocation;
use App\Models\Ride;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Trip lifecycle controlled by the driver (or an admin for cancel):
 *   start    scheduled -> on the road   (passengers are notified)
 *   complete on the road -> completed   (confirmed bookings complete + get receipts; unconfirmed ones are closed)
 *   cancel   any open ride -> cancelled (every open booking is cancelled, payments voided)
 */
class UpdateTripStatus
{
    public function __construct(private readonly TransitionBooking $transition) {}

    public function start(Ride $ride): Ride
    {
        $this->mustBeOpen($ride);

        if ($ride->started_at) {
            throw ValidationException::withMessages(['trip' => 'This trip has already started.']);
        }

        $ride->forceFill(['started_at' => now()])->save();
        $this->tellPassengers($ride, 'Your trip has started', 'Your driver has started the trip. Have a safe ride!');

        return $ride;
    }

    public function complete(Ride $ride): Ride
    {
        $this->mustBeOpen($ride);

        if (! $ride->started_at) {
            throw ValidationException::withMessages(['trip' => 'Start the trip before completing it.']);
        }

        DB::transaction(function () use ($ride) {
            $ride->bookings()->with('ride')->get()->each(function ($b) {
                if ($b->status === BookingStatus::Confirmed) {
                    $this->transition->handle($b, BookingStatus::Completed);
                } elseif ($b->status === BookingStatus::Approved && $b->payment?->status === PaymentStatus::Paid) {
                    // The passenger paid in person but never tapped "confirm": they clearly showed up.
                    // Close it as completed instead of cancelling a paid booking.
                    $this->transition->handle($b, BookingStatus::Confirmed);
                    $this->transition->handle($b->fresh(), BookingStatus::Completed);
                } elseif (in_array($b->status, [BookingStatus::Pending, BookingStatus::Approved], true)) {
                    // Never confirmed by the passenger before the trip: close it as a no-show.
                    $this->transition->handle($b, BookingStatus::Cancelled, 'Not confirmed before the trip.', null, true);
                }
            });

            $ride->forceFill(['status' => RideStatus::Completed, 'completed_at' => now()])->save();
            LiveLocation::where('ride_id', $ride->id)->delete(); // trip over: erase everyone's stored position
        });

        return $ride;
    }

    public function cancel(Ride $ride, ?string $reason, ?User $actor): Ride
    {
        $this->mustBeOpen($ride);

        // A driver can't cancel a ride that already has paid passengers (admins can, then refund).
        if (! $actor?->isAdmin() && $ride->bookings()->whereHas('payment', fn ($q) => $q->where('status', PaymentStatus::Paid->value))
            ->whereIn('status', [BookingStatus::Approved->value, BookingStatus::Confirmed->value])->exists()) {
            throw ValidationException::withMessages(['trip' => 'Passengers have already paid for this ride, so it can no longer be cancelled. Contact support if needed.']);
        }

        DB::transaction(function () use ($ride, $reason, $actor) {
            $ride->bookings()->get()->each(function ($b) use ($reason, $actor) {
                if (in_array($b->status, [BookingStatus::Pending, BookingStatus::Approved, BookingStatus::Confirmed], true)) {
                    $this->transition->handle($b, BookingStatus::Cancelled, 'Ride cancelled: '.($reason ?: 'no reason given'), $actor, true);
                }
            });

            $ride->forceFill([
                'status' => RideStatus::Cancelled,
                'cancelled_at' => now(),
                'cancellation_reason' => $reason ? mb_substr($reason, 0, 255) : null,
            ])->save();
            LiveLocation::where('ride_id', $ride->id)->delete();
        });

        return $ride;
    }

    private function mustBeOpen(Ride $ride): void
    {
        if ($ride->status !== RideStatus::Open) {
            throw ValidationException::withMessages(['trip' => 'This ride is already '.$ride->status->value.'.']);
        }
    }

    private function tellPassengers(Ride $ride, string $title, string $body): void
    {
        $ride->bookings()->with('passenger')
            ->whereIn('status', [BookingStatus::Approved->value, BookingStatus::Confirmed->value])
            ->get()
            ->each(fn ($b) => $b->passenger->notify(new AppNotice($title, $body, "/bookings/{$b->id}")));
    }
}
