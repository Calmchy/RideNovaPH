<?php

namespace App\Policies;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;

/**
 * Who may do what to a booking. Auto-discovered by Laravel (Booking -> BookingPolicy).
 * The driver is reached through ride -> vehicle -> driver_id (the schema keeps no
 * duplicate driver column on rides).
 */
class BookingPolicy
{
    private function isDriver(User $user, Booking $booking): bool
    {
        return $booking->ride->vehicle->driver_id === $user->id;
    }

    private function isPassenger(User $user, Booking $booking): bool
    {
        return $booking->passenger_id === $user->id;
    }

    /** Passenger, the ride's driver, or an admin. */
    public function view(User $user, Booking $booking): bool
    {
        return $this->isPassenger($user, $booking)
            || $this->isDriver($user, $booking)
            || $user->isAdmin();
    }

    public function approve(User $user, Booking $booking): bool
    {
        return $this->isDriver($user, $booking);
    }

    public function complete(User $user, Booking $booking): bool
    {
        return $this->isDriver($user, $booking);
    }

    public function confirm(User $user, Booking $booking): bool
    {
        return $this->isPassenger($user, $booking);
    }

    public function cancel(User $user, Booking $booking): bool
    {
        return $this->isPassenger($user, $booking) || $this->isDriver($user, $booking);
    }

    /** Either side of a COMPLETED trip may review, once each (DB unique key backs this up). */
    public function review(User $user, Booking $booking): bool
    {
        if ($booking->status !== BookingStatus::Completed) {
            return false;
        }

        $role = $booking->roleOf($user);

        return $role !== null && ! $booking->reviews()->where('reviewer_role', $role)->exists();
    }
}
