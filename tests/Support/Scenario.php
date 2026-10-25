<?php

namespace Tests\Support;

use App\Enums\ApprovalStatus;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\IdentityDocument;
use App\Models\IdType;
use App\Models\Ride;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Database\Seeders\LookupSeeder;

/** Small builders so each test reads like a story (driver, passenger with approved ID, a ride). */
class Scenario
{
    public static function lookups(): void
    {
        (new LookupSeeder)->run();
    }

    public static function passenger(bool $idApproved = true): User
    {
        $user = User::factory()->create();

        if ($idApproved) {
            IdentityDocument::create([
                'user_id' => $user->id, 'id_type_id' => IdType::first()->id,
                'front_image_path' => 'identity-documents/x.png', 'status' => ApprovalStatus::Approved,
            ]);
        }

        return $user;
    }

    public static function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role_id' => Role::ADMIN])->save();

        return $user;
    }

    public static function driver(bool $approved = true): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role_id' => Role::DRIVER])->save();
        DriverProfile::create([
            'user_id' => $user->id, 'license_number' => 'L-'.$user->id, 'license_expiry' => now()->addYear(),
            'license_image_path' => 'driver-licenses/x.png',
            'status' => $approved ? ApprovalStatus::Approved : ApprovalStatus::Pending,
        ]);

        return $user;
    }

    public static function vehicle(User $driver, int $seats = 5): Vehicle
    {
        return Vehicle::create([
            'driver_id' => $driver->id, 'model_id' => VehicleModel::first()->id,
            'color' => 'Silver', 'plate_number' => 'ABC '.random_int(1000, 9999), 'seat_capacity' => $seats,
        ]);
    }

    public static function ride(User $driver, array $overrides = []): Ride
    {
        $vehicle = self::vehicle($driver);

        return Ride::create($overrides + [
            'vehicle_id' => $vehicle->id,
            'origin_city_id' => City::where('name', 'Abuyog')->first()->id,
            'destination_city_id' => City::where('name', 'Tacloban City')->first()->id,
            'pickup_point' => 'Abuyog terminal', 'departure_at' => now()->addDays(3),
            'seats_offered' => 4, 'price_per_seat' => 200,
        ]);
    }

    /** A valid "Review & Reserve" form body. */
    public static function bookingForm(array $overrides = []): array
    {
        return $overrides + [
            'seats' => 1, 'contact_name' => 'Juan Dela Cruz', 'contact_address' => 'Brgy. 1, Abuyog',
            'contact_email' => 'juan@example.com', 'contact_phone' => '09171234567',
            'pickup_location' => 'Abuyog public market', 'pickup_at' => now()->addDays(3)->format('Y-m-d\TH:i'),
            'agree' => true,
        ];
    }
}
