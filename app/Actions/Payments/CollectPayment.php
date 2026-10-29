<?php

namespace App\Actions\Payments;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The DRIVER's "Paid" button. RideNovaPH is cash-on-ride, so the driver's confirmation that the
 * passenger handed over the fare is what turns the payment into "paid" and issues the receipt.
 *
 * Safe against double clicks: the booking row is locked and only a PENDING payment can be collected,
 * so a second request can never issue a second receipt.
 */
class CollectPayment
{
    public function handle(Booking $booking, User $driver): Payment
    {
        $payment = DB::transaction(function () use ($booking) {
            $locked = Booking::with('payment')->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            // Cash is only collected on a live trip: approved or confirmed (not pending, cancelled or done).
            if (! in_array($locked->status, [BookingStatus::Approved, BookingStatus::Confirmed], true)) {
                throw ValidationException::withMessages(['status' => 'Payment can only be recorded after you approve the booking, and before it is cancelled.']);
            }
            if ($locked->payment?->status !== PaymentStatus::Pending) {
                throw ValidationException::withMessages(['status' => 'This payment is already recorded.']);
            }

            $locked->payment->forceFill([
                'method' => 'cash',
                'status' => PaymentStatus::Paid,
                'paid_at' => now(),
                'receipt_no' => $locked->payment->receipt_no ?? Payment::generateReceiptNo(),
            ])->save();

            return $locked->payment;
        });

        ActivityLog::record($driver, 'payment.collected', $payment);

        // Tell BOTH sides, so neither can later dispute whether the cash changed hands.
        $url = "/bookings/{$booking->id}";
        $ref = $booking->reference_no;
        $amount = number_format((float) $payment->amount, 2);

        $booking->passenger->notify(new AppNotice('Payment received', "Your driver marked {$ref} as paid (₱{$amount}). Receipt {$payment->receipt_no}.", $url));
        $driver->notify(new AppNotice('Payment recorded', "You marked {$ref} as paid (₱{$amount}). Receipt {$payment->receipt_no}.", $url));

        return $payment;
    }
}
