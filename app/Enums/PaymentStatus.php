<?php

namespace App\Enums;

/**
 * Life of a payment row. v1 is cash-on-ride, so "paid" means the driver
 * collected the cash and the trip was completed.
 *  pending  -> booked, nothing collected yet
 *  paid     -> trip completed, receipt issued
 *  refunded -> an admin returned the money (receipt stays for the record)
 *  void     -> booking cancelled before any money moved
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Refunded = 'refunded';
    case Void = 'void';
}
