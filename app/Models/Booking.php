<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Booking extends Model
{
    protected $fillable = [
        'reference_no', 'ride_id', 'passenger_id', 'seats_booked', 'fare_per_seat',
        'status', 'approved_at', 'confirmed_at', 'completed_at', 'cancelled_at',
        'cancellation_reason',
        'contact_name', 'contact_address', 'contact_email', 'contact_phone',
        'pickup_location', 'pickup_lat', 'pickup_lng', 'pickup_at',
        'return_location', 'return_lat', 'return_lng', 'return_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => BookingStatus::class,
            'fare_per_seat' => 'decimal:2',
            'approved_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'pickup_at' => 'datetime',
            'return_at' => 'datetime',
        ];
    }

    /** e.g. RNP-20261004-7K3QX9 (the unique index is the safety net). */
    public static function generateReference(): string
    {
        do {
            $reference = 'RNP-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
        } while (static::where('reference_no', $reference)->exists());

        return $reference;
    }

    /** Derived, not stored. */
    /** Which side of this booking is the user on? 'passenger' | 'driver' | null. */
    public function roleOf(User $user): ?string
    {
        return match (true) {
            $this->passenger_id === $user->id => 'passenger',
            $this->ride->vehicle->driver_id === $user->id => 'driver',
            default => null,
        };
    }

    public function totalFare(): string
    {
        return number_format((float) $this->fare_per_seat * $this->seats_booked, 2, '.', '');
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function passenger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'passenger_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
