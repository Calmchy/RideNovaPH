<?php

namespace App\Actions\Rides;

use App\Enums\BookingStatus;
use App\Enums\RideStatus;
use App\Models\Ride;
use App\Models\User;
use App\Models\Vehicle;
use App\Notifications\AppNotice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A driver edits a ride they already published.
 *
 *  - Only an OPEN ride that has not started can be edited.
 *  - Always editable: the trip description, drop-off point, the linked event, and the seat count
 *    (never below the seats already booked, never above the vehicle's capacity).
 *  - Once ANY passenger has an active booking, the promise they booked is LOCKED: route, pick-up
 *    point, departure time, price and vehicle can no longer change (otherwise a driver could
 *    bait-and-switch a passenger). To change those, the driver cancels and republishes.
 *  - Passengers with active bookings are notified of any change.
 */
class UpdateRide
{
    /** Fields that passengers relied on when they booked. */
    private const LOCKED = ['vehicle_id', 'origin_city_id', 'destination_city_id', 'pickup_point', 'departure_at', 'price_per_seat'];

    /** @param array<string, mixed> $data validated by UpdateRideRequest */
    public function handle(User $driver, Ride $ride, array $data): Ride
    {
        $changed = false;

        DB::transaction(function () use ($driver, $ride, $data, &$changed) {
            // Lock the row so an edit and a booking can't interleave.
            $locked = Ride::whereKey($ride->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== RideStatus::Open || $locked->started_at) {
                throw ValidationException::withMessages(['trip' => 'Only a ride that has not started can be edited.']);
            }

            $active = $locked->bookings()->where('status', '!=', BookingStatus::Cancelled->value);
            $seatsTaken = (int) (clone $active)->sum('seats_booked');
            $hasBookings = (clone $active)->exists();

            $vehicle = Vehicle::where('driver_id', $driver->id)->whereKey($data['vehicle_id'])->first();
            if (! $vehicle) {
                throw ValidationException::withMessages(['vehicle_id' => 'Choose one of your registered vehicles.']);
            }
            if ((int) $data['seats_offered'] > $vehicle->seat_capacity) {
                throw ValidationException::withMessages(['seats_offered' => "This vehicle seats at most {$vehicle->seat_capacity} passengers."]);
            }
            if ((int) $data['seats_offered'] < $seatsTaken) {
                throw ValidationException::withMessages(['seats_offered' => "{$seatsTaken} seat(s) are already booked, so you can't offer fewer."]);
            }

            $departure = Carbon::parse($data['departure_at']);

            if ($hasBookings) {
                $same = [
                    'vehicle_id' => (int) $data['vehicle_id'] === (int) $locked->vehicle_id,
                    'origin_city_id' => (int) $data['origin_city_id'] === (int) $locked->origin_city_id,
                    'destination_city_id' => (int) $data['destination_city_id'] === (int) $locked->destination_city_id,
                    'pickup_point' => trim((string) $data['pickup_point']) === (string) $locked->pickup_point,
                    'departure_at' => $departure->equalTo($locked->departure_at),
                    'price_per_seat' => abs((float) $data['price_per_seat'] - (float) $locked->price_per_seat) < 0.005,
                ];
                foreach (self::LOCKED as $field) {
                    if (! $same[$field]) {
                        throw ValidationException::withMessages([$field => 'This can no longer be changed because passengers have already booked.']);
                    }
                }
            } elseif (! $departure->equalTo($locked->departure_at) && ! $departure->isFuture()) {
                throw ValidationException::withMessages(['departure_at' => 'Choose a departure time in the future.']);
            }

            $locked->fill([
                'vehicle_id' => $vehicle->id,
                'origin_city_id' => $data['origin_city_id'],
                'destination_city_id' => $data['destination_city_id'],
                'pickup_point' => $data['pickup_point'],
                'dropoff_point' => $data['dropoff_point'] ?? null,
                'departure_at' => $departure,
                'seats_offered' => $data['seats_offered'],
                'price_per_seat' => $data['price_per_seat'],
                'notes' => $data['notes'] ?? null,
                'announcement_id' => $data['announcement_id'] ?? null,
                'event_name' => $data['event_name'] ?? null,
            ]);
            $changed = $locked->isDirty();
            $locked->save();
        });

        if ($changed) {
            $ride->refresh()->bookings()->with('passenger')
                ->whereIn('status', [BookingStatus::Pending->value, BookingStatus::Approved->value, BookingStatus::Confirmed->value])
                ->get()->each(fn ($b) => $b->passenger->notify(new AppNotice(
                    'Ride details updated',
                    "The driver updated the details of your ride ({$b->reference_no}). Please review them.",
                    "/bookings/{$b->id}",
                )));
        }

        return $ride;
    }
}
