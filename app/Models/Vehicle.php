<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    /** Photo slot => [column, label]. The banner shows them in this order. */
    public const PHOTO_SLOTS = [
        'front' => ['photo_front_path', 'Front'],
        'back' => ['photo_back_path', 'Back'],
        'interior' => ['photo_interior_path', 'Interior'],
    ];

    protected $fillable = [
        'driver_id', 'model_id', 'color', 'plate_number',
        'seat_capacity', 'manufacture_year',
        'photo_front_path', 'photo_back_path', 'photo_interior_path', 'description', 'cor_image_path',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id', 'user_id');
    }

    public function model(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class, 'model_id');
    }

    public function rides(): HasMany
    {
        return $this->hasMany(Ride::class);
    }

    /** The banner slides as the browser needs them (url is null until the driver uploads that view). */
    public function gallery(): array
    {
        $slides = [];

        foreach (self::PHOTO_SLOTS as $key => [$column, $label]) {
            $slides[] = [
                'key' => $key,
                'label' => $label,
                'url' => $this->{$column} ? '/storage/'.$this->{$column} : null,
            ];
        }

        return $slides;
    }
}
