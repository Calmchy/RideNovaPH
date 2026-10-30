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

        $start = Carbon::parse($data['start_at']);
        $end = Carbon::parse($data['end_at']);
        $days = RentalRequest::daysBetween($start, $end);

        if ($days > self::MAX_DAYS) {
            throw ValidationException::withMessages(['end_at' => 'You can rent a vehicle for at most '.self::MAX_DAYS.' days at a time.']);
        }
        // The licence must still be valid on the day the vehicle comes back.
        if (Carbon::parse($data['license_expiry'])->lt($end->copy()->startOfDay())) {
            throw ValidationException::withMessages(['license_expiry' => 'Your licence expires before the rental ends.']);
        }

        $rental = DB::transaction(function () use ($renter, $owner, $vehicle, $data, $start, $end, $days) {
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
                'license_number' => $data['license_number'],
                'license_expiry' => $data['license_expiry'],
                'start_at' => $start,
                'end_at' => $end,
                'pickup_location' => $data['pickup_location'],
                'return_location' => $data['return_location'],
                'purpose' => $data['purpose'] ?? null,
                'days' => $days,
                'daily_rate' => $rate,
                'total_price' => round($rate * $days, 2),
                'status' => RentalStatus::Pending,
            ]);
        });

        ActivityLog::record($renter, 'rental.requested', $rental);
        $owner->notify(new AppNotice(
            'New vehicle rental request',
            "{$renter->name} wants to rent your {$vehicle->model->make->name} {$vehicle->model->name} for {$days} day(s) ({$rental->reference_no}). Review their details and approve or decline.",
            "/rentals/{$rental->id}",
        ));

        return $rental;
    }
}
