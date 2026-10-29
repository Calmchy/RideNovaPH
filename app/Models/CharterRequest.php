<?php

namespace App\Models;

use App\Enums\CharterStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/** A passenger group asking ONE driver to hire out a whole vehicle for a trip. */
class CharterRequest extends Model
{
    protected $fillable = [
        'reference_no', 'passenger_id', 'driver_id', 'vehicle_id', 'group_size',
        'pickup_location', 'dropoff_location', 'pickup_at', 'return_location', 'return_at',
        'description', 'status', 'quoted_price', 'driver_note', 'reason',
        'quoted_at', 'accepted_at', 'completed_at', 'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => CharterStatus::class,
            'pickup_at' => 'datetime',
            'return_at' => 'datetime',
            'quoted_price' => 'decimal:2',
            'quoted_at' => 'datetime',
            'accepted_at' => 'datetime',
            'completed_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    /** e.g. CHR-20261026-4H8K2Z */
    public static function generateReference(): string
    {
        do {
            $ref = 'CHR-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
        } while (static::where('reference_no', $ref)->exists());

        return $ref;
    }

    public function passenger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'passenger_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(CharterMessage::class);
    }

    /** 'passenger' | 'driver' | null: which side of this request is the user on? */
    public function roleOf(User $user): ?string
    {
        return match (true) {
            $this->passenger_id === $user->id => 'passenger',
            $this->driver_id === $user->id => 'driver',
            default => null,
        };
    }
}
