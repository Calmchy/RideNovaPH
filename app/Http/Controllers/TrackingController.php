<?php

namespace App\Http\Controllers;

use App\Actions\Tracking\RecordLocation;
use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\LiveLocation;
use App\Models\Ride;
use App\Support\Geo;
use App\Support\RidePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Live GPS tracking between a driver and the passengers of ONE ride. JSON only: the booking page polls
 * GET /bookings/{id}/tracking every few seconds and each phone POSTs its own position.
 *
 * Privacy rules enforced here:
 *   - only the booking's passenger and the ride's driver can read it (everyone else gets 403)
 *   - a passenger only ever sees the DRIVER's position; the driver only sees the passengers' positions
 *   - nothing is shared before the window opens or after the trip ends
 *   - sharing is opt-in on the device, and stop = the stored position is deleted
 */
class TrackingController extends Controller
{
    /** GET /bookings/{booking}/tracking : everything the live map needs in one small JSON document. */
    public function show(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();
        $booking->load(['ride.vehicle', 'ride.destination', 'ride.origin']);
        $ride = $booking->ride;

        $isDriver = $ride->vehicle->driver_id === $user->id;
        abort_unless($isDriver || $booking->passenger_id === $user->id, 403);

        $open = $booking->status === BookingStatus::Confirmed && RecordLocation::windowOpen($ride);

        $locations = $open ? LiveLocation::where('ride_id', $ride->id)
            ->whereIn('user_id', [$ride->vehicle->driver_id, $booking->passenger_id])->get()->keyBy('user_id') : collect();

        $driverLoc = $locations->get($ride->vehicle->driver_id);
        $passengerLoc = $locations->get($booking->passenger_id);

        // Pick-up = the pinned spot; fall back to the origin city centre when the passenger did not pin one.
        $originCoords = RidePresenter::coords($ride->origin);
        $pickup = $booking->pickup_lat !== null
            ? ['lat' => $booking->pickup_lat, 'lng' => $booking->pickup_lng, 'label' => $booking->pickup_location]
            : ($originCoords ? $originCoords + ['label' => $ride->pickup_point] : null);
        $destCoords = RidePresenter::coords($ride->destination);
        $destination = $destCoords ? $destCoords + ['label' => $ride->destination->name] : null;

        // Distance + ETA measured from the DRIVER's live position (or from the pick-up when it is unknown).
        $from = $driverLoc ? ['lat' => $driverLoc->latitude, 'lng' => $driverLoc->longitude] : $pickup;
        $speed = $driverLoc?->speed_kmh;
        $km = fn (?array $a, ?array $b) => $a && $b ? round(Geo::distanceKm($a['lat'], $a['lng'], $b['lat'], $b['lng']), 2) : null;
        $toPickup = $booking->driver_arrived_at ? 0.0 : $km($from, $pickup);
        $toDest = $km($from, $destination);

        return response()->json([
            'role' => $isDriver ? 'driver' : 'passenger',
            'status' => $booking->status->value,
            'trip_status' => $ride->tripStatus(),
            'window_open' => $open,
            'arrived' => $booking->driver_arrived_at !== null,
            'arrived_at' => $booking->driver_arrived_at?->toIso8601String(),
            'pickup' => $pickup,
            'destination' => $destination,
            // Each side only receives the OTHER side's position.
            'driver' => $isDriver ? null : $driverLoc?->toPayload(),
            'passenger' => $isDriver ? $passengerLoc?->toPayload() : null,
            'metrics' => [
                'estimated' => $driverLoc === null, // true = measured from the pick-up, not a live driver position
                'to_pickup_km' => $toPickup,
                'to_pickup_min' => $toPickup !== null ? ($toPickup == 0.0 ? 0 : Geo::etaMinutes($toPickup, $speed)) : null,
                'to_destination_km' => $toDest,
                'to_destination_min' => $toDest !== null ? Geo::etaMinutes($toDest, $speed) : null,
            ],
        ]);
    }

    /** POST /tracking/rides/{ride}/ping : my phone reports where I am. */
    public function ping(Request $request, Ride $ride, RecordLocation $record): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'heading' => ['nullable', 'integer', 'between:0,359'],
            'speed_kmh' => ['nullable', 'numeric', 'between:0,300'],
            'accuracy_m' => ['nullable', 'integer', 'between:0,100000'],
        ]);

        return response()->json(['arrived' => $record->handle($request->user(), $ride, $data)]);
    }

    /** DELETE /tracking/rides/{ride}/ping : stop sharing and erase my stored position. */
    public function stop(Request $request, Ride $ride): Response
    {
        LiveLocation::where('ride_id', $ride->id)->where('user_id', $request->user()->id)->delete();

        return response()->noContent();
    }

    /** POST /bookings/{booking}/arrived : the driver taps "I've arrived" (manual twin of the GPS auto-detect). */
    public function arrived(Request $request, Booking $booking): JsonResponse
    {
        $booking->load('ride.vehicle', 'passenger');
        abort_unless($booking->ride->vehicle->driver_id === $request->user()->id, 403);
        abort_unless($booking->status === BookingStatus::Confirmed && RecordLocation::windowOpen($booking->ride), 422, 'This booking is not active.');

        RecordLocation::markArrived($booking);

        return response()->json(['arrived' => true]);
    }
}
