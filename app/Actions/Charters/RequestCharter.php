<?php

namespace App\Actions\Charters;

use App\Enums\CharterStatus;
use App\Models\ActivityLog;
use App\Models\CharterRequest;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vehicle;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A passenger asks one driver to hire out a whole vehicle for their group.
 * Everything that depends on the DATABASE (not just the form shape) is checked here.
 */
class RequestCharter
{
    /** @param array<string, mixed> $data validated by StoreCharterRequest */
    public function handle(User $passenger, array $data): CharterRequest
    {
        $driver = User::with('driverProfile')->find($data['driver_id']);

        if (! $driver || $driver->id === $passenger->id) {
            throw ValidationException::withMessages(['driver_id' => 'Choose another driver. You can’t hire yourself.']);
        }
        if (! $driver->isApprovedDriver() || ! $driver->driverProfile?->available_for_hire) {
            throw ValidationException::withMessages(['driver_id' => 'This driver is not available for hire right now.']);
        }
        // Same trust rule as normal bookings: a verified ID first.
        if (Setting::bool('require_id_for_booking') && ! $passenger->hasApprovedId()) {
            throw ValidationException::withMessages(['driver_id' => 'Please get your ID verified before requesting a driver.']);
        }

        // whereKey + driver_id: a passenger can never pick someone else's vehicle by editing the form.
        $vehicle = Vehicle::where('driver_id', $driver->id)->whereKey($data['vehicle_id'])->first();
        if (! $vehicle) {
            throw ValidationException::withMessages(['vehicle_id' => 'Choose one of this driver’s vehicles.']);
        }
        if ((int) $data['group_size'] > $vehicle->seat_capacity) {
            throw ValidationException::withMessages(['group_size' => "This vehicle seats at most {$vehicle->seat_capacity} passengers."]);
        }

        $charter = DB::transaction(function () use ($passenger, $driver, $vehicle, $data) {
            // Anti-spam: limit open requests, and one open request per driver.
            $open = CharterRequest::where('passenger_id', $passenger->id)
                ->whereIn('status', [CharterStatus::Pending->value, CharterStatus::Quoted->value, CharterStatus::Accepted->value]);

            if ((clone $open)->where('driver_id', $driver->id)->exists()) {
                throw ValidationException::withMessages(['driver_id' => 'You already have an open request with this driver.']);
            }
            $max = Setting::int('max_open_charters');
            if ((clone $open)->count() >= $max) {
                throw ValidationException::withMessages(['driver_id' => "You can have at most {$max} open driver requests at a time. Cancel one first."]);
            }

            return CharterRequest::create([
                'reference_no' => CharterRequest::generateReference(),
                'passenger_id' => $passenger->id,
                'driver_id' => $driver->id,
                'vehicle_id' => $vehicle->id,
                'group_size' => $data['group_size'],
                'pickup_location' => $data['pickup_location'],
                'dropoff_location' => $data['dropoff_location'],
                'pickup_at' => $data['pickup_at'],
                'return_location' => $data['return_location'] ?? null,
                'return_at' => $data['return_at'] ?? null,
                'description' => $data['description'] ?? null,
                'passenger_name' => $data['passenger_name'],
                'passenger_phone' => $data['passenger_phone'],
                'status' => CharterStatus::Pending,
            ]);
        });

        ActivityLog::record($passenger, 'charter.requested', $charter);
        $driver->notify(new AppNotice(
            'New group booking request',
            "{$data['passenger_name']} wants to hire your vehicle for a group of {$charter->group_size} ({$charter->reference_no}). Review the terms and set your price.",
            "/charters/{$charter->id}",
        ));

        return $charter;
    }
}
