<?php

namespace App\Support;

use App\Enums\RideStatus;
use App\Models\City;
use App\Models\Ride;
use App\Models\User;

/**
 * Where a driver is: the destination of their most recent COMPLETED trip.
 * A driver who has arrived somewhere can only publish their next ride from that same town.
 * Drivers who have not completed any trip yet start from anywhere.
 */
class DriverLocation
{
    public static function lastArrival(User $driver): ?City
    {
        $ride = Ride::where('status', RideStatus::Completed->value)
            ->whereNotNull('completed_at')
            ->whereHas('vehicle', fn ($q) => $q->where('driver_id', $driver->id))
            ->with('destination.province')
            ->orderByDesc('completed_at')->orderByDesc('id')
            ->first();

        return $ride?->destination;
    }

    /** @return array{city_id: int, name: string, province: string}|null */
    public static function present(?City $city): ?array
    {
        return $city ? [
            'city_id' => $city->id,
            'name' => $city->name,
            'province' => $city->province?->name ?? '',
        ] : null;
    }
}
