<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVehicleRequest;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Vehicle registration. A driver only ever sees and edits THEIR OWN vehicles. */
class VehicleController extends Controller
{
    /** GET /driver/vehicles */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('driver/vehicles', [
            'has_profile' => $user->driverProfile !== null,
            'models' => VehicleModel::with('make')->get()->map(fn ($m) => ['id' => $m->id, 'label' => $m->make->name.' '.$m->name])->sortBy('label')->values(),
            'vehicles' => Vehicle::with('model.make')->withCount('rides')->where('driver_id', $user->id)->latest()->get()
                ->map(fn (Vehicle $v) => [
                    'id' => $v->id,
                    'model_id' => $v->model_id,
                    'name' => $v->model->make->name.' '.$v->model->name,
                    'color' => $v->color,
                    'plate_number' => $v->plate_number,
                    'seat_capacity' => $v->seat_capacity,
                    'manufacture_year' => $v->manufacture_year,
                    'rides_count' => $v->rides_count,
                ]),
        ]);
    }

    /** POST /driver/vehicles */
    public function store(StoreVehicleRequest $request): RedirectResponse
    {
        // vehicles.driver_id points at driver_profiles, so the licence submission must exist first.
        abort_unless($request->user()->driverProfile, 403, 'Submit your driver licence before registering a vehicle.');

        Vehicle::create($request->validated() + ['driver_id' => $request->user()->id]);
        $this->toast('Vehicle registered.');

        return back();
    }

    /** PATCH /driver/vehicles/{vehicle} */
    public function update(StoreVehicleRequest $request, Vehicle $vehicle): RedirectResponse
    {
        $this->owned($request, $vehicle);
        $vehicle->update($request->validated());
        $this->toast('Vehicle updated.');

        return back();
    }

    /** DELETE /driver/vehicles/{vehicle} : blocked once it has rides (history must stay intact). */
    public function destroy(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $this->owned($request, $vehicle);

        if ($vehicle->rides()->exists()) {
            $this->toast('This vehicle has ride history and cannot be removed.', 'error');

            return back();
        }

        $vehicle->delete();
        $this->toast('Vehicle removed.');

        return back();
    }

    /** Ownership check: 403 if the vehicle belongs to another driver (stops editing by guessing ids). */
    private function owned(Request $request, Vehicle $vehicle): void
    {
        abort_unless($vehicle->driver_id === $request->user()->id, 403);
    }
}
