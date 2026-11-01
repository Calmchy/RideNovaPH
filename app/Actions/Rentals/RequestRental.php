<?php

namespace App\Actions\Rentals;

use App\Enums\RentalStatus;
use App\Models\ActivityLog;
use App\Models\RentalRequest;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vehicle;
use App\Notifications\AppNotice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Someone asks to rent (and drive) a vehicle for a number of days.
 * The PRICE is never taken from the form: it is the owner's daily rate x days, worked out here.
 */
class RequestRental
{
    public const MAX_DAYS = 30;

    /** @param array<string, mixed> $data validated by StoreRentalRequest */
    public function handle(User $renter, array $data): RentalRequest
    {
        $vehicle = Vehicle::with(['driver.user', 'model.make'])->find($data['vehicle_id']);

        // Only a vehicle its owner switched on, with a rate, whose owner is still an approved driver.
        if (! $vehicle || ! $vehicle->available_for_rent || ! $vehicle->daily_rate || ! $vehicle->driver?->user?->isApprovedDriver()) {
            throw ValidationException::withMessages(['vehicle_id' => 'This vehicle is not available for rent right now.']);
        }
        $owner = $vehicle->driver->user;

        if ($owner->id === $renter->id) {
            throw ValidationException::withMessages(['vehicle_id' => 'You can’t rent your own vehicle.']);
        }
        if (Setting::bool('require_id_for_booking') && ! $renter->hasApprovedId()) {
            throw ValidationException::withMessages(['vehicle_id' => 'Please get your ID verified before renting a vehicle.']);
        }

        // The owner's Terms & Conditions (if any) are frozen onto the request; the renter must have agreed.
        $terms = $vehicle->rental_terms ?: null;
        if (! filter_var($data['accept_terms'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            throw ValidationException::withMessages(['accept_terms' => 'Please read and agree to the terms and conditions.']);
        }
        // The typed signature must be the renter's own name (ignoring case and extra spaces).
        $norm = fn (string $v) => mb_strtolower(trim(preg_replace('/\s+/', ' ', str_replace(['.', ','], ' ', $v))));
        if ($norm($data['signature_name']) !== $norm($data['renter_name'])) {
            throw ValidationException::withMessages(['signature_name' => 'Type your full name exactly as written above to sign.']);
        }

        // Requirements the owner set in the terms, checked against what the renter declared.
        $age = Carbon::parse($data['birth_date'])->age;
        if (isset($terms['min_age']) && $age < (int) $terms['min_age']) {
            throw ValidationException::withMessages(['birth_date' => 'The owner requires renters to be at least '.(int) $terms['min_age'].' years old.']);
        }
        if (isset($terms['min_experience_years']) && (int) $data['driving_years'] < (int) $terms['min_experience_years']) {
            throw ValidationException::withMessages(['driving_years' => 'The owner requires at least '.(int) $terms['min_experience_years'].' year(s) of driving experience.']);
        }
        if ((int) $data['passenger_count'] > (int) $vehicle->seat_capacity) {
            throw ValidationException::withMessages(['passenger_count' => 'This vehicle only has '.$vehicle->seat_capacity.' seats.']);
        }

        $start = Carbon::parse($data['start_at']);
        $end = Carbon::parse($data['end_at']);
        $days = RentalRequest::daysBetween($start, $end);

        if ($days > self::MAX_DAYS) {
            throw ValidationException::withMessages(['end_at' => 'You can rent a vehicle for at most '.self::MAX_DAYS.' days at a time.']);
        }

        // Licence ID photo: private disk, random name. Removed again if the request is refused below.
        $file = $data['license_id'];
        $licensePath = $file->storeAs('rental-license-ids', Str::uuid().'.'.$file->guessExtension(), 'local');

        try {
            $rental = DB::transaction(function () use ($renter, $owner, $vehicle, $data, $start, $end, $days, $terms, $licensePath) {
            // Lock the vehicle row so two renters can't both be accepted into the same dates.
            Vehicle::whereKey($vehicle->id)->lockForUpdate()->first();

            if (AdvanceRental::overlaps($vehicle->id, $start, $end)) {
                throw ValidationException::withMessages(['start_at' => 'This vehicle is already reserved for some of those dates. Try other dates.']);
            }

            $open = RentalRequest::where('renter_id', $renter->id)->whereIn('status', [RentalStatus::Pending->value, RentalStatus::Approved->value]);
            if ((clone $open)->where('vehicle_id', $vehicle->id)->exists()) {
                throw ValidationException::withMessages(['vehicle_id' => 'You already have an open request for this vehicle.']);
            }
            $max = (int) Setting::get('max_open_rentals', '3');
            if ((clone $open)->count() >= $max) {
                throw ValidationException::withMessages(['vehicle_id' => "You can have at most {$max} open rental requests at a time. Cancel one first."]);
            }

            $rate = (float) $vehicle->daily_rate;

            return RentalRequest::create([
                'reference_no' => RentalRequest::generateReference(),
                'renter_id' => $renter->id,
                'owner_id' => $owner->id,
                'vehicle_id' => $vehicle->id,
                'renter_name' => $data['renter_name'],
                'renter_phone' => $data['renter_phone'],
                'renter_address' => $data['renter_address'],
                'license_id_path' => $licensePath,
                'start_at' => $start,
                'end_at' => $end,
                'pickup_location' => $data['pickup_location'],
                'return_location' => $data['return_location'],
                'purpose' => $data['purpose'] ?? null,
                'days' => $days,
                'daily_rate' => $rate,
                'total_price' => round($rate * $days, 2),
                'status' => RentalStatus::Pending,
                // Frozen copy of what the renter agreed to.
                'terms_snapshot' => $terms,
                'terms_accepted_at' => now(),
                'birth_date' => $data['birth_date'],
                'license_type' => $data['license_type'],
                'driving_years' => $data['driving_years'],
                'passenger_count' => $data['passenger_count'],
                'emergency_name' => $data['emergency_name'],
                'emergency_phone' => $data['emergency_phone'],
                'emergency_relationship' => $data['emergency_relationship'],
                'emergency_address' => $data['emergency_address'],
                'destination' => $data['destination'],
                'additional_drivers' => $data['additional_drivers'] ?? null,
                'signature_name' => $data['signature_name'],
            ]);
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($licensePath);

            throw $e;
        }

        ActivityLog::record($renter, 'rental.requested', $rental);
        $owner->notify(new AppNotice(
            'New vehicle rental request',
            "{$renter->name} wants to rent your {$vehicle->model->make->name} {$vehicle->model->name} for {$days} day(s) ({$rental->reference_no}). Review their details and approve or decline.",
            "/rentals/{$rental->id}",
        ));

        return $rental;
    }
}
