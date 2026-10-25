<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Bookings\TransitionBooking;
use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Booking;
use App\Support\Like;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Admin > Bookings: search every reservation by reference / passenger, and force-cancel when needed. */
class BookingController extends Controller
{
    /** GET /admin/bookings?status=&q=&from=&to= */
    public function index(Request $request): Response
    {
        $f = $request->validate([
            'status' => ['nullable', 'in:pending,approved,confirmed,completed,cancelled'],
            'q' => ['nullable', 'string', 'max:60'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $bookings = Booking::with(['ride.origin', 'ride.destination', 'ride.vehicle.driver.user', 'passenger:id,name,phone_number', 'payment'])
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['from'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($f['to'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('reference_no', 'like', Like::contains($v))
                ->orWhereHas('passenger', fn ($p) => $p->where('name', 'like', Like::contains($v)))))
            ->latest()->paginate(15)->withQueryString();

        return Inertia::render('admin/bookings', [
            'filters' => $f,
            'bookings' => $bookings->through(fn (Booking $b) => [
                'id' => $b->id,
                'reference_no' => $b->reference_no,
                'passenger' => $b->passenger->name,
                'phone' => $b->contact_phone ?? $b->passenger->phone_number,
                'driver' => $b->ride->vehicle->driver->user->name,
                'route' => $b->ride->origin->name.' → '.$b->ride->destination->name,
                'departure_at' => $b->ride->departure_at->toIso8601String(),
                'seats' => $b->seats_booked,
                'status' => $b->status->value,
                'payment_status' => $b->payment?->status->value,
                'amount' => $b->payment?->amount,
                'can_cancel' => in_array($b->status, [BookingStatus::Pending, BookingStatus::Approved, BookingStatus::Confirmed], true),
            ]),
        ]);
    }

    /** PATCH /admin/bookings/{booking}/cancel : admin override (skips the passenger cut-off). */
    public function cancel(Request $request, Booking $booking, TransitionBooking $transition): RedirectResponse
    {
        $reason = $request->validate(['reason' => ['required', 'string', 'max:255']])['reason'];

        $transition->handle($booking, BookingStatus::Cancelled, 'Cancelled by admin: '.$reason, $request->user(), true);
        ActivityLog::record($request->user(), 'booking.cancelled', $booking, ['reason' => $reason]);
        $this->toast('Booking cancelled.');

        return back();
    }
}
