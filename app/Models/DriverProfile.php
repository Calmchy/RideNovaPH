<?php

namespace App\Models;

use App\Enums\ApprovalStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DriverProfile extends Model
{
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $fillable = [
        'user_id', 'license_number', 'license_expiry', 'license_image_path',
        'status', 'reviewed_by', 'reviewed_at', 'remarks', 'bio', 'allows_luggage', 'available_for_hire',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApprovalStatus::class,
            'license_expiry' => 'date',
            'reviewed_at' => 'datetime',
            'allows_luggage' => 'boolean',
            'available_for_hire' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class, 'driver_id', 'user_id');
    }
}
