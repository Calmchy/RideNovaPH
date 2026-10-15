<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Rides\UpdateTripStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\City;
use App\Models\Ride;
use App\Notifications\AppNotice;
use App\Support\Like;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Admin > Rides: monitor every ride, cancel a problem ride (passengers are notified and payments voided). */
class RideController extends Controller
{
    /** GET /admin/rides?status=&q=&origin=&date= */
    public function index(Request $request): Response
    {
        $f = $request->validate([
            'status' => ['nullable', 'in:open,completed,cancelled'],
            'q' => ['nullable', 'string', 'max:60'],
            'origin' => ['nullable', 'integer', 'exists:cities,id'],
            'date' => ['nullable', 'date'],
        ]);

        $rides = Ride::with(['origin', 'destination', 'vehicle.model.make', 'vehicle.driver.user'])->withSeatsTaken()
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['origin'] ?? null, fn ($q, $v) => $q->where('origin_city_id', $v))
            ->when($f['date'] ?? null, fn ($q, $v) => $q->whereDate('departure_at', $v))
            // Grouped in one where(): a bare orWhere here would escape the other filters.
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->whereHas('vehicle.driver.user', fn ($u) => $u->where('name', 'like', Like::contains($v)))
                ->orWhereHas('vehicle', fn ($x) => $x->where('plate_number', 'like', Like::contains($v)))))
            ->orderByDesc('departure_at')->paginate(12)->withQueryString();

        return Inertia::render('admin/rides', [
            'filters' => $f,
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'rides' => $rides->through(fn (Ride $r) => [
                'id' => $r->id,
                'route' => $r->origin->name.' → '.$r->destination->name,
                'driver' => $r->vehicle->driver->user->name,
                'vehicle' => $r->vehicle->model->make->name.' '.$r->vehicle->model->name.' · '.$r->vehicle->plate_number,
                'departure_at' => $r->departure_at->toIso8601String(),
                'price_per_seat' => $r->price_per_seat,
                'seats' => ($r->seats_offered - (int) $r->seats_taken).'/'.$r->seats_offered,
                'status' => $r->tripStatus(),
                'cancellation_reason' => $r->cancellation_reason,
            ]),
        ]);
    }

    /** PATCH /admin/rides/{ride}/cancel */
    public function cancel(Request $request, Ride $ride, UpdateTripStatus $trip): RedirectResponse
    {
        $reason = $request->validate(['reason' => ['required', 'string', 'max:255']])['reason'];

        $trip->cancel($ride, 'Cancelled by admin: '.$reason, $request->user());
        $ride->loadMissing('vehicle.driver.user');
        $ride->vehicle->driver->user->notify(new AppNotice('Ride cancelled by admin', "Your ride on {$ride->departure_at->format('M j, g:i A')} was cancelled: {$reason}", '/driver/rides/'.$ride->id));
        ActivityLog::record($request->user(), 'ride.cancelled', $ride, ['reason' => $reason]);
        $this->toast('Ride cancelled.');

        return back();
    }
}
