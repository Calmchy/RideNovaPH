<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Vehicle;
use App\Notifications\AppNotice;
use App\Support\Like;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Admin > Vehicles: check each registered vehicle's photos and COR, then approve or reject WITH a reason. */
class VehicleController extends Controller
{
    /** GET /admin/vehicles?status=&q= */
    public function index(Request $request): Response
    {
        $f = $request->validate([
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'q' => ['nullable', 'string', 'max:60'],
        ]);

        $vehicles = Vehicle::with(['model.make', 'driver.user:id,name,email,phone_number'])
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('review_status', $v))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('plate_number', 'like', Like::contains($v))
                ->orWhere('vin', 'like', Like::contains($v))
                ->orWhereHas('driver.user', fn ($u) => $u->where('name', 'like', Like::contains($v)))))
            ->orderByRaw("case review_status when 'pending' then 0 else 1 end")->latest()
            ->paginate(10)->withQueryString();

        return Inertia::render('admin/vehicles', [
            'filters' => $f,
            'pending_count' => Vehicle::where('review_status', 'pending')->count(),
            'vehicles' => $vehicles->through(fn (Vehicle $v) => [
                'id' => $v->id,
                'name' => $v->model->make->name.' '.$v->model->name,
                'color' => $v->color,
                'plate_number' => $v->plate_number,
                'vin' => $v->vin,
                'seats' => $v->seat_capacity,
                'year' => $v->manufacture_year,
                'description' => $v->description,
                'owner' => ['id' => $v->driver_id, 'name' => $v->driver->user->name, 'email' => $v->driver->user->email, 'phone' => $v->driver->user->phone_number],
                'photos' => $v->gallery(),
                'has_cor' => $v->cor_image_path !== null,
                'status' => $v->review_status,
                'remarks' => $v->review_remarks,
                'registered_at' => $v->created_at->toIso8601String(),
            ]),
        ]);
    }

    /** PATCH /admin/vehicles/{vehicle} : approve, or reject with the reason the driver will be told. */
    public function decide(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'remarks' => ['required_if:decision,rejected', 'nullable', 'string', 'max:255'],
        ], ['remarks.required_if' => 'Tell the driver why the vehicle was rejected.']);

        $approve = $data['decision'] === 'approved';

        if ($approve && ! $vehicle->cor_image_path) {
            $this->toast('This vehicle has no COR yet, so it can’t be approved.', 'error');

            return back();
        }

        $vehicle->forceFill([
            'review_status' => $data['decision'],
            'review_remarks' => $approve ? null : trim($data['remarks']),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            // A rejected vehicle must not stay listed for rent.
            'available_for_rent' => $approve ? $vehicle->available_for_rent : false,
        ])->save();

        $label = $vehicle->model->make->name.' '.$vehicle->model->name.' ('.$vehicle->plate_number.')';
        $vehicle->driver->user->notify(new AppNotice(
            $approve ? 'Vehicle approved' : 'Vehicle rejected',
            $approve
                ? "{$label} is approved. You can now publish rides and list it for rent."
                : "{$label} was rejected. Reason: {$vehicle->review_remarks}. Fix it (new photos or COR) and it goes back for review.",
            '/driver/vehicles',
        ));
        ActivityLog::record($request->user(), "vehicle.{$data['decision']}", $vehicle, ['remarks' => $vehicle->review_remarks]);
        $this->toast('Vehicle '.$data['decision'].'. The driver has been notified.');

        return back();
    }
}
