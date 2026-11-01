<?php

namespace App\Http\Controllers\Driver;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\CharterRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The driver's own inbox (inside the Driver area, not the passenger Bookings page):
 *  - seat requests passengers sent for THIS driver's rides
 *  - "hire the whole vehicle" requests from groups
 * Approving, completing and cancelling still go through the normal booking / charter endpoints,
 * which check on the server that the person is really the driver of that booking.
 */
class RequestController extends Controller
{
    /** GET /driver/requests */
    public function passengers(Request $request): Response
    {
        $user = $request->user();
        $filters = $request->validate([
            'status' => ['nullable', 'in:pending,approved,confirmed,completed,cancelled'],
            'q' => ['nullable', 'string', 'max:40'],
        ]);

        $mine = fn ($q) => $q->where('driver_id', $user->id);

        $bookings = Booking::whereHas('ride.vehicle', $mine)
            ->with(['ride.origin', 'ride.destination', 'passenger:id,name', 'payment'])
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where('reference_no', 'like', '%'.addcslashes($v, '%_\\').'%'))
            ->latest()->paginate(10)->withQueryString();

        return Inertia::render('driver/requests', [
            'filters' => $filters,
            'pending' => Booking::whereHas('ride.vehicle', $mine)->where('status', BookingStatus::Pending->value)->count(),
            'bookings' => $bookings->through(fn (Booking $b) => [
                'id' => $b->id,
                'reference_no' => $b->reference_no,
                'status' => $b->status->value,
                'seats' => $b->seats_booked,
                'total_fare' => $b->totalFare(),
                'route' => $b->ride->origin->name.' → '.$b->ride->destination->name,
                'departure_at' => $b->ride->departure_at->toIso8601String(),
                'payment_status' => $b->payment?->status->value,
                'passenger' => $b->passenger->name,
            ]),
        ]);
    }

    /** GET /driver/hire */
    public function hire(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('driver/hire', [
            'available_for_hire' => (bool) $user->driverProfile?->available_for_hire,
            'incoming' => CharterRequest::with('passenger:id,name')->where('driver_id', $user->id)
                ->latest()->limit(30)->get()
                ->map(fn (CharterRequest $c) => [
                    'id' => $c->id,
                    'reference_no' => $c->reference_no,
                    'status' => $c->status->value,
                    'passenger' => $c->passenger_name ?: $c->passenger->name,
                    'group_size' => $c->group_size,
                    'pickup_location' => $c->pickup_location,
                    'pickup_at' => $c->pickup_at->toIso8601String(),
                    'quoted_price' => $c->quoted_price,
                ]),
        ]);
    }
}
