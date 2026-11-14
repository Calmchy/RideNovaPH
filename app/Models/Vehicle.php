<?php

namespace App\Models;

use App\Enums\RentalStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
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
        'driver_id', 'model_id', 'color', 'plate_number', 'vin',
        'seat_capacity', 'manufacture_year',
        'photo_front_path', 'photo_back_path', 'photo_interior_path', 'description', 'cor_image_path',
    ];

    protected function casts(): array
    {
        return ['rental_terms' => 'array', 'reviewed_at' => 'datetime'];
    }

    /** Only vehicles an admin has approved may carry rides or be listed for rent. */
    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('review_status', 'approved');
    }

    public function isApproved(): bool
    {
        return $this->review_status === 'approved';
    }

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

    public function rentals(): HasMany
    {
        return $this->hasMany(RentalRequest::class);
    }

    /**
     * Is this vehicle in someone else's hands? True while an APPROVED rental has started and the owner has not
     * marked it returned (even if it is overdue), and, when $at is given, if $at falls inside an approved
     * rental window. Pending requests do not block anything.
     */
    public function isRentedOut(?CarbonInterface $at = null): bool
    {
        return $this->rentals()
            ->where('status', RentalStatus::Approved->value)
            ->where(fn ($q) => $q->where('start_at', '<=', now())
                ->when($at, fn ($q) => $q->orWhere(fn ($w) => $w->where('start_at', '<=', $at)->where('end_at', '>=', $at))))
            ->exists();
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
