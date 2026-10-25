<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReviewRequest;
use App\Models\Booking;
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
}
