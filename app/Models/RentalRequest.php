<?php

namespace App\Models;

use App\Enums\RentalStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/** One person asking to rent (and drive) another driver's vehicle for a number of days. */
class RentalRequest extends Model
{
    protected $fillable = [
        'reference_no', 'renter_id', 'owner_id', 'vehicle_id',
        'renter_name', 'renter_phone', 'renter_address', 'license_number', 'license_expiry',
        'start_at', 'end_at', 'pickup_location', 'return_location', 'purpose',
        'days', 'daily_rate', 'total_price', 'status', 'owner_note', 'reason',
        'approved_at', 'completed_at', 'closed_at', 'terms_snapshot', 'terms_accepted_at',
        'birth_date', 'license_type', 'driving_years', 'passenger_count',
        'emergency_name', 'emergency_phone', 'destination', 'additional_drivers', 'signature_name', 'license_id_path', 'emergency_relationship', 'emergency_address',
    ];

    public const LICENSE_TYPES = [
        'non_professional' => 'Non-professional',
        'professional' => 'Professional',
        'international' => 'International Driving Permit',
    ];

    protected function casts(): array
    {
        return [
            'status' => RentalStatus::class,
            'birth_date' => 'encrypted',       // sensitive: never stored in plain text
            'license_number' => 'encrypted',   // sensitive: never stored in plain text
            'license_expiry' => 'date',
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'daily_rate' => 'decimal:2',
            'total_price' => 'decimal:2',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
            'closed_at' => 'datetime',
            'terms_snapshot' => 'array',
            'terms_accepted_at' => 'datetime',
        ];
    }

    /** e.g. RNT-20261030-4H8K2Z */
    public static function generateReference(): string
    {
        do {
            $ref = 'RNT-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
        } while (static::where('reference_no', $ref)->exists());

        return $ref;
    }

    /** Whole rental days: every started 24 hours counts as a day (minimum 1). */
    public static function daysBetween(\DateTimeInterface $start, \DateTimeInterface $end): int
    {
        $hours = max(0, ($end->getTimestamp() - $start->getTimestamp()) / 3600);

        return max(1, (int) ceil($hours / 24));
    }

    public function renter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'renter_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function extensions(): HasMany
    {
        return $this->hasMany(RentalExtension::class)->latest('id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /** 'renter' | 'owner' | null */
    public function roleOf(User $user): ?string
    {
        return match (true) {
            $this->renter_id === $user->id => 'renter',
            $this->owner_id === $user->id => 'owner',
            default => null,
        };
    }
}
