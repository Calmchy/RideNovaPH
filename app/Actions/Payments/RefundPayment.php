<?php

namespace App\Actions\Payments;

use App\Enums\PaymentStatus;
use App\Models\ActivityLog;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Admin refund of a PAID payment. The receipt stays (it is the record), the status
 * becomes "refunded", and both sides are told. Row-locked so a double click can't refund twice.
 */
class RefundPayment
{
    public function handle(Payment $payment, User $admin, string $reason): Payment
    {
        $refunded = DB::transaction(function () use ($payment, $admin, $reason) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== PaymentStatus::Paid) {
                throw ValidationException::withMessages(['refund' => 'Only paid payments can be refunded.']);
            }

            $locked->forceFill([
                'status' => PaymentStatus::Refunded,
                'refunded_at' => now(),
                'refund_reason' => mb_substr($reason, 0, 255),
                'refunded_by' => $admin->id,
            ])->save();

            ActivityLog::record($admin, 'payment.refunded', $locked, ['reason' => $reason]);

            return $locked;
        });

        $booking = $refunded->booking()->with('passenger', 'ride.vehicle.driver.user')->first();
        $msg = "Refund issued for {$booking->reference_no}: {$reason}";
        $booking->passenger->notify(new AppNotice('Payment refunded', $msg, "/bookings/{$booking->id}"));
        $booking->ride->vehicle->driver->user->notify(new AppNotice('Payment refunded', $msg, "/bookings/{$booking->id}"));

        return $refunded;
    }
}
