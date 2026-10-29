<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReviewRequest;
use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    /** POST /bookings/{booking}/reviews : passenger rates the driver, or driver rates the passenger. */
    public function store(StoreReviewRequest $request, Booking $booking): RedirectResponse
    {
        // Role comes from who is logged in, never from the form, so nobody can post as the other side.
        $role = $booking->roleOf($request->user());

        try {
            $booking->reviews()->create($request->validated() + ['reviewer_role' => $role]);
        } catch (UniqueConstraintViolationException) {
            // Two tabs submitting at once: the DB unique(booking_id, reviewer_role) key wins.
            throw ValidationException::withMessages(['rating' => 'You already reviewed this trip.']);
        }

        $this->toast('Thanks for your review!');

        return back();
    }

    /**
     * GET /reviews : MY review history. "about_me" = what others wrote about me (as a driver or a passenger),
     * "by_me" = what I wrote. Scoped by booking so nobody can read reviews of other people's trips.
     */
    public function history(Request $request): Response
    {
        $me = $request->user();

        $mine = fn () => Review::query()->with(['booking.ride.origin', 'booking.ride.destination', 'booking.passenger:id,name', 'booking.ride.vehicle.driver.user:id,name']);

        $row = fn (Review $r, string $who) => [
            'id' => $r->id,
            'rating' => $r->rating,
            'comment' => $r->comment,
            'at' => $r->created_at?->toIso8601String(),
            'trip' => $r->booking->ride->origin->name.' → '.$r->booking->ride->destination->name,
            'booking_id' => $r->booking_id,
            'who' => $who,
        ];

        // About me: I was the passenger and a driver reviewed me, or I was the driver and a passenger reviewed me.
        $aboutMe = $mine()->where(fn ($q) => $q
            ->where(fn ($p) => $p->where('reviewer_role', 'driver')->whereHas('booking', fn ($b) => $b->where('passenger_id', $me->id)))
            ->orWhere(fn ($d) => $d->where('reviewer_role', 'passenger')->whereHas('booking.ride.vehicle', fn ($v) => $v->where('driver_id', $me->id))))
            ->latest()->limit(100)->get()
            ->map(fn (Review $r) => $row($r, $r->reviewer_role->value === 'passenger' ? 'A passenger' : 'The driver'));

        // By me: the reviews I wrote.
        $byMe = $mine()->where(fn ($q) => $q
            ->where(fn ($p) => $p->where('reviewer_role', 'passenger')->whereHas('booking', fn ($b) => $b->where('passenger_id', $me->id)))
            ->orWhere(fn ($d) => $d->where('reviewer_role', 'driver')->whereHas('booking.ride.vehicle', fn ($v) => $v->where('driver_id', $me->id))))
            ->latest()->limit(100)->get()
            ->map(fn (Review $r) => $row($r, $r->reviewer_role->value === 'passenger'
                ? ($r->booking->ride->vehicle->driver->user->name ?? 'Driver')
                : ($r->booking->passenger->name ?? 'Passenger')));

        return Inertia::render('reviews/history', ['about_me' => $aboutMe, 'by_me' => $byMe]);
    }
}
