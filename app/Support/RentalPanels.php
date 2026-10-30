<?php

namespace App\Support;

use App\Models\RentalRequest;
use App\Models\User;
use App\Models\Vehicle;

/** Rental data for the "Hire a driver" page: my requests, the owner's vehicles + the requests they received. */
class RentalPanels
{
    public static function label(Vehicle $v): string
    {
        return $v->model->make->name.' '.$v->model->name.' · '.$v->color;
    }

    /** @return array{my_rentals: mixed, is_owner: bool, my_vehicles: mixed, incoming_rentals: mixed} */
    public static function for(User $user): array
    {
        $row = fn (RentalRequest $r, string $other) => [
            'id' => $r->id,
            'reference_no' => $r->reference_no,
            'status' => $r->status->value,
            'other' => $other,
            'vehicle' => self::label($r->vehicle),
            'start_at' => $r->start_at->toIso8601String(),
            'end_at' => $r->end_at->toIso8601String(),
            'days' => $r->days,
            'total_price' => $r->total_price,
        ];

        $isOwner = $user->isApprovedDriver();

        return [
            'is_owner' => $isOwner,
            'my_rentals' => RentalRequest::with(['owner:id,name', 'vehicle.model.make'])->where('renter_id', $user->id)
                ->latest()->limit(30)->get()->map(fn ($r) => $row($r, $r->owner->name)),
            'incoming_rentals' => $isOwner
                ? RentalRequest::with(['renter:id,name', 'vehicle.model.make'])->where('owner_id', $user->id)
                    ->latest()->limit(30)->get()->map(fn ($r) => $row($r, $r->renter->name))
                : [],
            'my_vehicles' => $isOwner
                ? Vehicle::with('model.make')->where('driver_id', $user->id)->get()->map(fn (Vehicle $v) => [
                    'id' => $v->id,
                    'label' => self::label($v).' · '.$v->plate_number,
                    'available_for_rent' => (bool) $v->available_for_rent,
                    'daily_rate' => $v->daily_rate,
                    'rental_terms' => $v->rental_terms ?? (object) [],
                ])
                : [],
        ];
    }
}
