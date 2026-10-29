<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Support\DriverReviews;
use App\Models\Ride;
use App\Models\Setting;
use App\Support\RidePresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RideController extends Controller
{
    /** GET /rides : the old public search now lives inside the Bookings hub (find tab). */
    public function index(Request $request): RedirectResponse
    {
        return to_route('bookings.index', ['tab' => 'find'] + $request->only(['origin', 'destination', 'date']));
    }

    /** GET /rides/{ride} : public detail page with the driver's average rating and the viewer's own booking, if any. */
    public function show(Request $request, Ride $ride): Response
    {
        $ride->load(RidePresenter::WITH);
        $driverId = $ride->vehicle->driver_id;

        // Average of what PASSENGERS said about this driver across all their trips.
        $rating = Review::where('reviewer_role', 'passenger')
            ->whereHas('booking.ride.vehicle', fn ($q) => $q->where('driver_id', $driverId))
            ->selectRaw('AVG(rating) as average, COUNT(*) as total')
            ->first();

        $user = $request->user();
        $mine = $user?->bookings()->where('ride_id', $ride->id)->first();

        return Inertia::render('rides/show', [
            'ride' => RidePresenter::card($ride) + [
                'notes' => $ride->notes,
                'status' => $ride->status->value,
                'trip_status' => $ride->tripStatus(),
            ],
            'driver_rating' => [
                'average' => $rating->total ? round((float) $rating->average, 1) : null,
                'total' => (int) $rating->total,
            ],
            'reviews' => DriverReviews::for($driverId, 5),
            'rating_summary' => DriverReviews::summary($driverId),
            'driver_id' => $driverId,
            'my_booking_id' => $mine?->id,
            'can_book' => $user !== null
                && $driverId !== $user->id
                && ($user->hasApprovedId() || ! Setting::bool('require_id_for_booking')),
            'has_approved_id' => $user?->hasApprovedId() ?? false,
        ]);
    }
}
