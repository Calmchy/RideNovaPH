<?php

namespace App\Enums;

/**
 * Life of a group charter request.
 *  pending   -> passenger sent the terms, waiting for the driver
 *  quoted    -> driver accepted the terms and named a price, waiting for the passenger
 *  accepted  -> passenger agreed to the price: the trip is on
 *  completed -> driver marked the trip done
 *  declined  -> driver said no
 *  cancelled -> either side backed out (reason kept)
 */
enum CharterStatus: string
{
    case Pending = 'pending';
    case Quoted = 'quoted';
    case Accepted = 'accepted';
    case Completed = 'completed';
    case Declined = 'declined';
    case Cancelled = 'cancelled';

    /** Still in play (counts toward limits, chat stays open). */
    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::Quoted, self::Accepted], true);
    }
}
