<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Banner extends Model
{
    protected $fillable = [
        'created_by', 'city_id', 'title', 'caption', 'image_path', 'link_url',
        'display_order', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Homepage slideshow (Query 9). */
    public function scopeSlideshow(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('display_order');
    }
}
