<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One request to extend a rental by a number of days (pending until the owner accepts or declines). */
class RentalExtension extends Model
{
    protected $fillable = [
        'rental_request_id', 'days', 'extra_price', 'old_end_at', 'new_end_at', 'status', 'reason', 'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'extra_price' => 'decimal:2',
            'old_end_at' => 'datetime',
            'new_end_at' => 'datetime',
            'decided_at' => 'datetime',
        ];
    }

    public function rental(): BelongsTo
    {
        return $this->belongsTo(RentalRequest::class, 'rental_request_id');
    }
}
