<?php

namespace App\Support;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Review;
use App\Models\User;

/**
 * Builds the SAFE public profile of "the other person on a booking".
 *
 * A passenger sees the driver's profile, a driver sees the passenger's. Only what is needed to
 * trust and recognise each other is exposed. Never included: email, home address, emergency
 * contact, ID/licence images or numbers. The phone number is revealed only once the driver has
 * approved the booking (so a stranger who merely sent a request cannot harvest numbers) and is
 * hidden again if the booking is cancelled.
 */
class PartnerProfile
{
    /** Statuses during which both people may see each other's phone number. */
    private const PHONE_VISIBLE = [BookingStatus::Approved, BookingStatus::Confirmed, BookingStatus::Completed];

    /**
     * @param  string  $viewerRole  'passenger' | 'driver' (who is LOOKING at the profile)
     * @return array<string, mixed>
     */
    public static function for(Booking $booking, string $viewerRole): array
    {
        $isDriverProfile = $viewerRole === 'passenger';      // passenger looks at the driver
        $vehicle = $booking->ride->vehicle;
        $user = $isDriverProfile ? $vehicle->driver->user : $booking->passenger;

        return [
            'role' => $isDriverProfile ? 'driver' : 'passenger',
            'name' => $user->name,
            'member_since' => $user->created_at?->toIso8601String(),
            'id_verified' => $user->hasApprovedId(),
            'rating' => self::rating($user, $isDriverProfile),
            'trips_completed' => self::tripsCompleted($user, $isDriverProfile),
            'phone' => in_array($booking->status, self::PHONE_VISIBLE, true) ? $user->phone_number : null,
            // Driver-only extras: short bio, luggage policy and the vehicle used for THIS trip.
            'bio' => $isDriverProfile ? $vehicle->driver->bio : null,
            'allows_luggage' => $isDriverProfile ? (bool) $vehicle->driver->allows_luggage : null,
            'vehicle' => $isDriverProfile ? [
                'name' => $vehicle->model->make->name.' '.$vehicle->model->name,
                'color' => $vehicle->color,
                'plate_number' => $vehicle->plate_number,
                'seats' => $vehicle->seat_capacity,
                'year' => $vehicle->manufacture_year,
            ] : null,
            'recent_reviews' => self::recentReviews($user, $isDriverProfile),
        ];
    }

    /**
     * Reviews ABOUT this person: a driver is rated by passengers, a passenger by drivers.
     * Scoped through bookings so we never expose reviews about someone else.
     */
    private static function aboutQuery(User $user, bool $isDriver)
    {
        return Review::query()
            ->where('reviewer_role', $isDriver ? 'passenger' : 'driver')
            ->whereHas('booking', fn ($b) => $isDriver
                ? $b->whereHas('ride.vehicle', fn ($v) => $v->where('driver_id', $user->id))
                : $b->where('passenger_id', $user->id));
    }

    private static function rating(User $user, bool $isDriver): array
    {
        $q = self::aboutQuery($user, $isDriver);
        $total = (clone $q)->count();

        return [
            'average' => $total ? round((float) (clone $q)->avg('rating'), 1) : null,
            'total' => $total,
        ];
    }

    private static function tripsCompleted(User $user, bool $isDriver): int
    {
        return Booking::where('status', BookingStatus::Completed->value)
            ->when($isDriver,
                fn ($b) => $b->whereHas('ride.vehicle', fn ($v) => $v->where('driver_id', $user->id)),
                fn ($b) => $b->where('passenger_id', $user->id))
            ->count();
    }

    private static function recentReviews(User $user, bool $isDriver): array
    {
        return self::aboutQuery($user, $isDriver)
            ->whereNotNull('comment')->latest()->limit(3)->get()
            ->map(fn (Review $r) => [
                'rating' => $r->rating,
                'comment' => $r->comment,
                'at' => $r->created_at?->toIso8601String(),
            ])->all();
    }
}
