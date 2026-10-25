<?php

namespace Database\Seeders;

use App\Enums\ApprovalStatus;
use App\Models\Announcement;
use App\Models\AnnouncementCategory;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\IdentityDocument;
use App\Models\IdType;
use App\Models\Ride;
use App\Models\Role;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * LOCAL DEMO DATA ONLY (see DatabaseSeeder): an approved driver with a vehicle and a few rides,
 * a passenger whose ID is already verified, and sample announcements.
 * All demo accounts use the password "password". Never run this in production.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // A 1x1 PNG so the admin "view ID" links have something to stream.
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        Storage::disk('local')->put('identity-documents/demo.png', $png);
        Storage::disk('local')->put('driver-licenses/demo.png', $png);

        $passenger = User::firstOrCreate(['email' => 'passenger@ridenovaph.test'], [
            'name' => 'Demo Passenger', 'password' => 'password', 'phone_number' => '09171234567',
        ]);
        $passenger->forceFill(['email_verified_at' => now(), 'role_id' => Role::PASSENGER])->save();
        IdentityDocument::firstOrCreate(['user_id' => $passenger->id], [
            'id_type_id' => IdType::first()->id, 'front_image_path' => 'identity-documents/demo.png',
            'status' => ApprovalStatus::Approved, 'reviewed_at' => now(),
        ]);

        $driver = User::firstOrCreate(['email' => 'driver@ridenovaph.test'], [
            'name' => 'Demo Driver', 'password' => 'password', 'phone_number' => '09181234567',
        ]);
        $driver->forceFill(['email_verified_at' => now(), 'role_id' => Role::DRIVER])->save();
        DriverProfile::firstOrCreate(['user_id' => $driver->id], [
            'license_number' => 'N01-23-456789', 'license_expiry' => now()->addYears(3),
            'license_image_path' => 'driver-licenses/demo.png', 'status' => ApprovalStatus::Approved,
            'reviewed_at' => now(), 'bio' => 'Safe, on-time trips around Leyte.',
        ]);

        $vehicle = Vehicle::firstOrCreate(['plate_number' => 'ABC 1234'], [
            'driver_id' => $driver->id, 'model_id' => VehicleModel::where('name', 'Innova')->first()->id,
            'color' => 'Silver', 'seat_capacity' => 6, 'manufacture_year' => 2021,
        ]);

        $c = fn (string $name) => City::where('name', $name)->first()->id;

        if (! Ride::exists()) {
            foreach ([
                ['Abuyog', 'Tacloban City', 2, 250], ['Tacloban City', 'Ormoc City', 4, 300],
                ['Baybay City', 'Tacloban City', 6, 350], ['Maasin City', 'Tacloban City', 9, 450],
            ] as [$from, $to, $days, $price]) {
                Ride::create([
                    'vehicle_id' => $vehicle->id, 'origin_city_id' => $c($from), 'destination_city_id' => $c($to),
                    'pickup_point' => "{$from} Public Terminal", 'dropoff_point' => "{$to} Central Terminal",
                    'departure_at' => now()->addDays($days)->setTime(6, 30), 'seats_offered' => 5, 'price_per_seat' => $price,
                ]);
            }
        }

        if (! Announcement::exists()) {
            foreach ([
                ['LPT', 'LPT Examination — Tacloban Testing Center', 'Tacloban City', 20],
                ['CSE', 'Civil Service Exam — Ormoc', 'Ormoc City', 35],
                ['TESDA', 'TESDA NC II Assessment — Maasin', 'Maasin City', 14],
            ] as [$cat, $title, $city, $days]) {
                Announcement::create([
                    'category_id' => AnnouncementCategory::where('name', $cat)->first()->id, 'city_id' => $c($city),
                    'title' => $title, 'body' => 'Plan your trip early. Book a seat from the Bookings page.', 'exam_date' => now()->addDays($days),
                ]);
            }
        }
    }
}
