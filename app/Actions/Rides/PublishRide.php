<?php

namespace App\Actions\Rides;

use App\Models\Ride;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Validation\ValidationException;

/**
 * A driver publishes a ride. The rules that depend on the DATABASE (not just the form
 * shape) live here: the vehicle must belong to this driver, and the driver must be approved.
 */
class PublishRide
{
    /** @param array<string, mixed> $data validated by StoreRideRequest */
    public function handle(User $driver, array $data): Ride
    {
        if (! $driver->isApprovedDriver()) {
            throw ValidationException::withMessages(['vehicle_id' => 'Your driver licence must be approved before you can publish rides.']);
        }

        // whereKey + driver_id: a driver can never publish on someone else's vehicle by editing the form.
        $vehicle = Vehicle::where('driver_id', $driver->id)->whereKey($data['vehicle_id'])->first();

        if (! $vehicle) {
            throw ValidationException::withMessages(['vehicle_id' => 'Choose one of your registered vehicles.']);
        }

        if ((int) $data['seats_offered'] > $vehicle->seat_capacity) {
            throw ValidationException::withMessages(['seats_offered' => "This vehicle seats at most {$vehicle->seat_capacity} passengers."]);
        }

        return Ride::create([
            'vehicle_id' => $vehicle->id,
            'origin_city_id' => $data['origin_city_id'],
            'destination_city_id' => $data['destination_city_id'],
            'pickup_point' => $data['pickup_point'],
            'dropoff_point' => $data['dropoff_point'] ?? null,
            'departure_at' => $data['departure_at'],
            'seats_offered' => $data['seats_offered'],
            'price_per_seat' => $data['price_per_seat'],
            'notes' => $data['notes'] ?? null,
            'announcement_id' => $data['announcement_id'] ?? null,
        ]);
    }
}
