<?php

namespace App\Actions\Payments;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;

/**
 * Cash collected + trip completed -> payment is "paid" and a receipt number is issued.
 * Idempotent: calling it twice never issues a second receipt.
 */
class SettlePayment
{
    public function handle(Booking $booking): ?Payment
    {
        $payment = $booking->payment;

        if (! $payment || $payment->status !== PaymentStatus::Pending) {
            return $payment;
        }

        $payment->forceFill([
            'status' => PaymentStatus::Paid,
            'paid_at' => now(),
            'receipt_no' => $payment->receipt_no ?? Payment::generateReceiptNo(),
        ])->save();

        return $payment;
    }
}
