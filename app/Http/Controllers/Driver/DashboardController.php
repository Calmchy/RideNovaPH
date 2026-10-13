<?php

namespace App\Http\Controllers\Driver;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\RideStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Ride;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** GET /driver : the driver's home (earnings, pending requests, next trips). */
class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $profile = $user->driverProfile;

        $myRides = fn () => Ride::whereHas('vehicle', fn ($q) => $q->where('driver_id', $user->id));
        $myPayments = fn () => Payment::whereHas('booking.ride.vehicle', fn ($q) => $q->where('driver_id', $user->id));

        $paid = fn (string $col) => (float) $myPayments()->where('status', PaymentStatus::Paid->value)->sum($col);

        return Inertia::render('driver/dashboard', [
            'application' => ['status' => $profile?->status->value, 'remarks' => $profile?->remarks],
            'vehicles_count' => $profile?->vehicles()->count() ?? 0,
            'stats' => [
                'earned' => $paid('driver_earnings'),
                'pending_cash' => (float) $myPayments()->where('status', PaymentStatus::Pending->value)->sum('driver_earnings'),
                'fees_paid' => $paid('platform_fee'),
                'open_rides' => $myRides()->where('status', RideStatus::Open->value)->count(),
                'pending_requests' => Booking::whereHas('ride.vehicle', fn ($q) => $q->where('driver_id', $user->id))
                    ->where('status', BookingStatus::Pending->value)->count(),
                'completed_trips' => Booking::whereHas('ride.vehicle', fn ($q) => $q->where('driver_id', $user->id))
                    ->where('status', BookingStatus::Completed->value)->count(),
            ],
            'upcoming' => $myRides()->with(['origin', 'destination'])->withSeatsTaken()
                ->where('status', RideStatus::Open->value)->orderBy('departure_at')->limit(5)->get()
                ->map(fn (Ride $r) => [
                    'id' => $r->id,
                    'route' => $r->origin->name.' → '.$r->destination->name,
                    'departure_at' => $r->departure_at->toIso8601String(),
                    'seats_offered' => $r->seats_offered,
                    'seats_taken' => (int) $r->seats_taken,
                    'trip_status' => $r->tripStatus(),
                ]),
        ]);
    }
}
