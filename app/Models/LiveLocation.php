<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** The latest GPS position of one user on one ride. Overwritten on every ping, deleted when the trip ends. */
class LiveLocation extends Model
{
    public $timestamps = false;

    protected $fillable = ['ride_id', 'user_id', 'latitude', 'longitude', 'heading', 'speed_kmh', 'accuracy_m', 'recorded_at'];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'speed_kmh' => 'float',
            'recorded_at' => 'datetime',
        ];
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    /** Seen in the last minute? Older than that and the UI shows "last seen" instead of "live". */
    public function isOnline(): bool
    {
        return $this->recorded_at->gt(now()->subSeconds(60));
    }

    /** Shape sent to the browser. */
    public function toPayload(): array
    {
        return [
            'lat' => $this->latitude,
            'lng' => $this->longitude,
            'heading' => $this->heading,
            'speed_kmh' => $this->speed_kmh,
            'seconds_ago' => max(0, (int) $this->recorded_at->diffInSeconds(now())),
            'online' => $this->isOnline(),
        ];
    }
}
