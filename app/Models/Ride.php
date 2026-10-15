<?php

namespace App\Models;

use App\Enums\BookingStatus;
use App\Enums\RideStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The driver is reached through the vehicle:
 * Ride::with('vehicle.driver.user') -> $ride->vehicle->driver->user
 */
class Ride extends Model
{
    protected $fillable = [
        'vehicle_id', 'announcement_id', 'origin_city_id', 'destination_city_id',
        'pickup_point', 'dropoff_point', 'departure_at', 'seats_offered',
        'price_per_seat', 'notes', 'status',
        'started_at', 'completed_at', 'cancelled_at', 'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'departure_at' => 'datetime',
            'price_per_seat' => 'decimal:2',
            'status' => RideStatus::class,
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function origin(): BelongsTo
    {
        return $this->belongsTo(City::class, 'origin_city_id');
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(City::class, 'destination_city_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /** Open rides that haven't departed yet. */
    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', RideStatus::Open->value)
            ->where('departure_at', '>=', now());
    }

    /** Adds a `seats_taken` column (non-cancelled bookings only). */
    public function scopeWithSeatsTaken(Builder $query): Builder
    {
        return $query->withSum(
            ['bookings as seats_taken' => fn (Builder $b) => $b->where('status', '!=', BookingStatus::Cancelled->value)],
            'seats_booked',
        );
    }

    /** Ride search with seats left (Query 2): only rides that still have room. */
    public function scopeWithSeatsLeft(Builder $query): Builder
    {
        return $query->withSeatsTaken()->whereRaw(
            'seats_offered - COALESCE((select sum(b.seats_booked) from bookings b where b.ride_id = rides.id and b.status != ?), 0) > 0',
            [BookingStatus::Cancelled->value],
        );
    }

    /** Human-friendly trip state derived from status + timestamps: scheduled | on_the_road | completed | cancelled. */
    public function tripStatus(): string
    {
        return match (true) {
            $this->status === RideStatus::Cancelled => 'cancelled',
            $this->status === RideStatus::Completed => 'completed',
            $this->started_at !== null => 'on_the_road',
            default => 'scheduled',
        };
    }

    /** Seats still free. Calculated, never stored. */
    public function seatsLeft(): int
    {
        $taken = $this->seats_taken
            ?? $this->bookings()->where('status', '!=', BookingStatus::Cancelled->value)->sum('seats_booked');

        return $this->seats_offered - (int) $taken;
    }
}
