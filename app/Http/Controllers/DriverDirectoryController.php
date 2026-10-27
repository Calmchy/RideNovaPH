<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Enums\BookingStatus;
use App\Models\DriverProfile;
use App\Models\Ride;
use App\Models\User;
use App\Support\DriverReviews;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Available drivers": a neutral directory of every registered AND verified driver.
 * Deliberately NOT ranked by rating or earnings, so drivers don't compete for the top spot.
 * Order is alphabetical. Only safe public details are exposed (no email, address, licence, ID).
 */
class DriverDirectoryController extends Controller
{
    /** Approved driver profile whose owner also has an approved ID = "registered and verified". */
    public static function verifiedDrivers()
    {
        return DriverProfile::query()
            ->where('status', ApprovalStatus::Approved->value)
            ->whereHas('user.identityDocuments', fn ($d) => $d->where('status', ApprovalStatus::Approved->value));
    }

    /** The driver's soonest open ride = their "current route" (null when nothing is published). */
    private static function currentRoute(int $driverId): ?array
    {
        $ride = Ride::with(['origin', 'destination'])->available()
            ->whereHas('vehicle', fn ($q) => $q->where('driver_id', $driverId))
            ->orderBy('departure_at')->first();

        return $ride ? [
            'id' => $ride->id,
            'route' => $ride->origin->name.' → '.$ride->destination->name,
            'departure_at' => $ride->departure_at->toIso8601String(),
            'price_per_seat' => $ride->price_per_seat,
        ] : null;
    }

    /** GET /drivers : everyone verified, with their current route. */
    public function index(Request $request): Response
    {
        $drivers = self::verifiedDrivers()->with(['user:id,name', 'vehicles.model.make'])
            ->get()->sortBy(fn ($p) => mb_strtolower($p->user->name))->values()
            ->map(fn (DriverProfile $p) => [
                'id' => $p->user_id,
                'name' => $p->user->name,
                'vehicles' => $p->vehicles->map(fn ($v) => $v->model->make->name.' '.$v->model->name)->all(),
                'current_route' => self::currentRoute($p->user_id),
                'available_for_hire' => (bool) $p->available_for_hire,
            ]);

        return Inertia::render('drivers/index', ['drivers' => $drivers]);
    }

    /** GET /drivers/{user} : one driver's public profile. 404 unless registered and verified. */
    public function show(Request $request, User $user): Response
    {
        $profile = self::verifiedDrivers()->with(['user:id,name,created_at', 'vehicles.model.make'])
            ->where('user_id', $user->id)->firstOrFail();

        $summary = DriverReviews::summary($user->id);

        $upcoming = Ride::with(['origin', 'destination'])->available()
            ->whereHas('vehicle', fn ($q) => $q->where('driver_id', $user->id))
            ->orderBy('departure_at')->limit(5)->get()
            ->map(fn (Ride $r) => [
                'id' => $r->id,
                'route' => $r->origin->name.' → '.$r->destination->name,
                'departure_at' => $r->departure_at->toIso8601String(),
                'price_per_seat' => $r->price_per_seat,
            ]);

        return Inertia::render('drivers/show', [
            'driver' => [
                'id' => $user->id,
                'name' => $profile->user->name,
                'member_since' => $profile->user->created_at?->toIso8601String(),
                'bio' => $profile->bio,
                'allows_luggage' => (bool) $profile->allows_luggage,
                'available_for_hire' => (bool) $profile->available_for_hire,
                'rating' => $summary['average'],
                'reviews' => $summary['total'],
                'trips_completed' => \App\Models\Booking::where('status', BookingStatus::Completed->value)
                    ->whereHas('ride.vehicle', fn ($v) => $v->where('driver_id', $user->id))->count(),
                'vehicles' => $profile->vehicles->map(fn ($v) => [
                    'name' => $v->model->make->name.' '.$v->model->name,
                    'color' => $v->color,
                    'seats' => $v->seat_capacity,
                ])->all(),
                'recent_reviews' => DriverReviews::for($user->id, 20),
            ],
            'summary' => $summary,
            'upcoming' => $upcoming,
            'is_me' => $request->user()->id === $user->id,
        ]);
    }

    /** GET /drivers/{user}/reviews?stars=N : the driver's full PUBLIC review history (guests can read it). */
    public function reviews(Request $request, User $user): Response
    {
        $profile = self::verifiedDrivers()->with('user:id,name')->where('user_id', $user->id)->firstOrFail();
        $stars = $request->integer('stars') ?: null;

        return Inertia::render('rides/driver-reviews', [
            'driver' => ['id' => $user->id, 'name' => $profile->user->name],
            'summary' => DriverReviews::summary($user->id),
            'reviews' => DriverReviews::history($user->id, $stars),
            'stars' => $stars,
        ]);
    }
}
