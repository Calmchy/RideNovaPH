<?php

namespace App\Support;

use App\Models\Ride;

/**
 * Turns a Ride into the small, safe array the React pages need.
 * Whitelisting fields here (instead of returning the model) guarantees no
 * internal columns or relations leak into the browser.
 * Expects: origin, destination, vehicle.model.make, vehicle.driver.user loaded.
 */
class RidePresenter
{
    /** Relations every card needs; use with Ride::with(RidePresenter::WITH). */
    public const WITH = ['origin', 'destination', 'vehicle.model.make', 'vehicle.driver.user'];

    public static function card(Ride $ride): array
    {
        return [
            'id' => $ride->id,
            'origin' => $ride->origin->name,
            'destination' => $ride->destination->name,
            'pickup_point' => $ride->pickup_point,
            'dropoff_point' => $ride->dropoff_point,
            'departure_at' => $ride->departure_at->toIso8601String(),
            'price_per_seat' => $ride->price_per_seat,
            'seats_left' => $ride->seatsLeft(),
            'vehicle' => trim(
                $ride->vehicle->model->make->name.' '.$ride->vehicle->model->name.' · '.$ride->vehicle->color
            ),
            'driver_name' => $ride->vehicle->driver->user->name,
        ];
    }

    /** City centre as [lat, lng] for map centring, or null when not seeded. */
    public static function coords(?\App\Models\City $city): ?array
    {
        return $city && $city->latitude !== null
            ? ['lat' => (float) $city->latitude, 'lng' => (float) $city->longitude]
            : null;
    }
}
