<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    public $timestamps = false;

    protected $fillable = ['province_id', 'name', 'latitude', 'longitude'];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function ridesFrom(): HasMany
    {
        return $this->hasMany(Ride::class, 'origin_city_id');
    }

    public function ridesTo(): HasMany
    {
        return $this->hasMany(Ride::class, 'destination_city_id');
    }
}
