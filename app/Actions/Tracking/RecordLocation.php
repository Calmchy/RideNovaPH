<?php

namespace App\Actions\Tracking;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\LiveLocation;
use App\Models\Ride;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AppNotice;
use App\Support\Geo;
use Illuminate\Validation\ValidationException;

/**
 * Store a participant's latest GPS position and, for the driver, detect arrival at a pick-up.
 *
 * Who may share: the ride's driver, or a passenger with a CONFIRMED booking on that ride.
 * When: only while the trip is scheduled/on the road AND departure is within the tracking window
 * (default 2 h). Outside that, nothing is stored, so nobody can be followed days in advance.
 */
class RecordLocation
{
    /** Is the live-tracking window open for this ride right now? */
    public static function windowOpen(Ride $ride): bool
    {
        if (! in_array($ride->tripStatus(), ['scheduled', 'on_the_road'], true)) {
            return false;
        }

        return $ride->started_at !== null
            || $ride->departure_at->lte(now()->addHours(Setting::int('tracking_window_hours')));
    }

    /** Role of $user on $ride: 'driver', 'passenger' or null (stranger). */
    public static function roleOn(User $user, Ride $ride): ?string
    {
        $ride->loadMissing('vehicle');

        if ($ride->vehicle->driver_id === $user->id) {
            return 'driver';
        }

        $isPassenger = $ride->bookings()->where('passenger_id', $user->id)
            ->where('status', BookingStatus::Confirmed->value)->exists();

        return $isPassenger ? 'passenger' : null;
    }

    /**
     * @param  array{lat: float, lng: float, heading?: int|null, speed_kmh?: float|null, accuracy_m?: int|null}  $p
     * @return list<int> ids of bookings whose driver-arrived flag was set by THIS ping
     */
    public function handle(User $user, Ride $ride, array $p): array
    {
        $role = self::roleOn($user, $ride);

        if (! $role) {
            abort(403, 'You are not part of this ride.');
        }

        if (! self::windowOpen($ride)) {
            throw ValidationException::withMessages(['tracking' => 'Live tracking is not open for this trip right now.']);
        }

        LiveLocation::updateOrCreate(
            ['ride_id' => $ride->id, 'user_id' => $user->id],
            [
                'latitude' => $p['lat'],
                'longitude' => $p['lng'],
                'heading' => $p['heading'] ?? null,
                'speed_kmh' => $p['speed_kmh'] ?? null,
                'accuracy_m' => $p['accuracy_m'] ?? null,
                'recorded_at' => now(),
            ],
        );

        return $role === 'driver' ? $this->detectArrivals($ride, $p['lat'], $p['lng']) : [];
    }

    /** Driver within the arrival radius (default 150 m) of a passenger's pinned pick-up => mark + notify. */
    private function detectArrivals(Ride $ride, float $lat, float $lng): array
    {
        $radiusKm = Setting::int('arrival_radius_m') / 1000;
        $arrived = [];

        $ride->bookings()->with('passenger')
            ->where('status', BookingStatus::Confirmed->value)
            ->whereNull('driver_arrived_at')
            ->whereNotNull('pickup_lat')->whereNotNull('pickup_lng')
            ->get()
            ->each(function (Booking $b) use ($lat, $lng, $radiusKm, &$arrived) {
                if (Geo::distanceKm($lat, $lng, $b->pickup_lat, $b->pickup_lng) <= $radiusKm) {
                    self::markArrived($b);
                    $arrived[] = $b->id;
                }
            });

        return $arrived;
    }

    /** Set the arrival time once and tell the passenger. Safe to call twice (second call is a no-op). */
    public static function markArrived(Booking $booking): void
    {
        $changed = Booking::whereKey($booking->id)->whereNull('driver_arrived_at')
            ->update(['driver_arrived_at' => now()]);

        if ($changed) {
            $booking->passenger->notify(new AppNotice(
                'Your driver has arrived',
                "Your driver is at your pick-up point for {$booking->reference_no}.",
                "/bookings/{$booking->id}",
            ));
        }
    }
}
