<?php

namespace App\Policies;

use App\Models\CharterRequest;
use App\Models\User;

/**
 * Who may do what to a charter request. Auto-discovered (CharterRequest -> CharterRequestPolicy).
 * Only the two people involved ever see a request or its chat.
 */
class CharterRequestPolicy
{
    public function view(User $user, CharterRequest $charter): bool
    {
        return $charter->roleOf($user) !== null;
    }

    /** Only the DRIVER names the price, declines, or marks the trip complete. */
    public function quote(User $user, CharterRequest $charter): bool
    {
        return $charter->driver_id === $user->id;
    }

    public function decline(User $user, CharterRequest $charter): bool
    {
        return $charter->driver_id === $user->id;
    }

    public function complete(User $user, CharterRequest $charter): bool
    {
        return $charter->driver_id === $user->id;
    }

    /** Only the PASSENGER can agree to the driver's price. */
    public function accept(User $user, CharterRequest $charter): bool
    {
        return $charter->passenger_id === $user->id;
    }

    public function cancel(User $user, CharterRequest $charter): bool
    {
        return $charter->roleOf($user) !== null;
    }

    public function message(User $user, CharterRequest $charter): bool
    {
        return $charter->roleOf($user) !== null;
    }
}
