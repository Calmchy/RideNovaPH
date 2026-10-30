<?php

namespace App\Enums;

/**
 * Life of a self-drive rental request.
 *  pending   -> renter sent their info, waiting for the owner
 *  approved  -> owner said yes: the vehicle is reserved for those dates
 *  completed -> owner marked the vehicle as returned
 *  declined  -> owner said no
 *  cancelled -> either side backed out (reason kept)
 */
enum RentalStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Completed = 'completed';
    case Declined = 'declined';
    case Cancelled = 'cancelled';

    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::Approved], true);
    }
}
