<?php

namespace App\Policies;

use App\Models\RentalRequest;
use App\Models\User;

/** Only the renter and the owner can see a rental request (it carries licence details). */
class RentalRequestPolicy
{
    public function view(User $user, RentalRequest $rental): bool
    {
        return $rental->roleOf($user) !== null;
    }

    public function approve(User $user, RentalRequest $rental): bool
    {
        return $rental->owner_id === $user->id;
    }

    public function decline(User $user, RentalRequest $rental): bool
    {
        return $rental->owner_id === $user->id;
    }

    public function complete(User $user, RentalRequest $rental): bool
    {
        return $rental->owner_id === $user->id;
    }

    public function cancel(User $user, RentalRequest $rental): bool
    {
        return $rental->roleOf($user) !== null;
    }
}
