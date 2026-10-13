<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * One payment per booking. Money columns are SNAPSHOTS taken when the booking
 * is made (fare x seats, the platform fee at that time), so changing the fee
 * setting later never rewrites history.
 */
class Payment extends Model
{
    protected $fillable = [
        'booking_id', 'receipt_no', 'method', 'status', 'amount', 'platform_fee',
        'driver_earnings', 'cancellation_fee', 'fee_status', 'fee_settled_at', 'paid_at', 'refunded_at', 'refund_reason', 'refunded_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => PaymentStatus::class,
            'amount' => 'decimal:2',
            'platform_fee' => 'decimal:2',
            'driver_earnings' => 'decimal:2',
            'cancellation_fee' => 'decimal:2',
            'fee_settled_at' => 'datetime',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    /** e.g. RCPT-20261011-4H8K2Z, issued once, when the payment becomes "paid". */
    public static function generateReceiptNo(): string
    {
        do {
            $no = 'RCPT-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
        } while (static::where('receipt_no', $no)->exists());

        return $no;
    }

    /**
     * Split a fare into platform fee and driver earnings.
     *
     * @return array{amount: string, platform_fee: string, driver_earnings: string}
     */
    public static function split(float $amount, float $feePercent): array
    {
        $fee = round($amount * $feePercent / 100, 2);

        return [
            'amount' => number_format($amount, 2, '.', ''),
            'platform_fee' => number_format($fee, 2, '.', ''),
            'driver_earnings' => number_format($amount - $fee, 2, '.', ''),
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function refunder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }
}
