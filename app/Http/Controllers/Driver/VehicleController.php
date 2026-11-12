<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVehicleRequest;
use App\Models\Vehicle;
use App\Models\VehicleMake;
use App\Models\VehicleModel;
use App\Notifications\AppNotice;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
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
            // When the next vehicle may be registered (2 minutes after the last one) to stop spam.
            'next_vehicle_at' => $this->nextVehicleAt($user->id)?->toIso8601String(),
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
                    'photos' => $v->gallery(),
                    'description' => $v->description,
                    'vin' => $v->vin,
                    'review_status' => $v->review_status,
                    'review_remarks' => $v->review_remarks,
                    // Private file: streamed to its owner only (Settings\DocumentController@cor). ?v busts the cache on replace.
                    'cor_url' => $v->cor_image_path ? "/settings/documents/cor/{$v->id}?v={$v->updated_at->timestamp}" : null,
                ]),
        ]);
    }

    /** POST /driver/vehicles */
    public function store(StoreVehicleRequest $request): RedirectResponse
    {
        // vehicles.driver_id points at driver_profiles, so the licence submission must exist first.
        abort_unless($request->user()->driverProfile, 403, 'Submit your driver licence before registering a vehicle.');

        if ($wait = $this->nextVehicleAt($request->user()->id)) {
            $secs = max(1, (int) now()->diffInSeconds($wait, false));
            $this->toast(sprintf('Please wait %d:%02d before registering another vehicle. This limit keeps the system free of spam.', intdiv($secs, 60), $secs % 60), 'warning');
            $request->user()->notify(new AppNotice('Vehicle registration limit', 'You can register another vehicle 2 minutes after your last one. Please try again shortly.', '/driver/vehicles'));

            return back();
        }

        // Photos, COR and description are added later from the vehicle's card. An admin reviews it before it can be used.
        $data = $this->withModel($request->validated());

        $vehicle = Vehicle::create($data + ['driver_id' => $request->user()->id]);
        $vehicle->forceFill(['review_status' => 'draft'])->save();
        $this->toast('Vehicle saved. Add its photos and COR, then press Submit for review.');

        return back();
    }

    /** PATCH /driver/vehicles/{vehicle} */
    public function update(StoreVehicleRequest $request, Vehicle $vehicle): RedirectResponse
    {
        $this->owned($request, $vehicle);
        $vehicle->update($this->withModel($request->validated()));
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

        foreach (Vehicle::PHOTO_SLOTS as [$column]) {
            if ($vehicle->{$column}) {
                Storage::disk('public')->delete($vehicle->{$column});
            }
        }

        if ($vehicle->cor_image_path) {
            Storage::disk('local')->delete($vehicle->cor_image_path);
        }

        $vehicle->delete();
        $this->toast('Vehicle removed.');

        return back();
    }

    /** POST /driver/vehicles/{vehicle}/photos/{slot} : replace one banner photo (front | back | interior). */
    public function photo(Request $request, Vehicle $vehicle, string $slot): RedirectResponse
    {
        $this->owned($request, $vehicle);
        abort_unless(isset(Vehicle::PHOTO_SLOTS[$slot]), 404);

        $request->validate([
            'photo' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
        ], [
            'photo.required' => 'Choose a photo to upload.',
        ]);

        [$column, $label] = Vehicle::PHOTO_SLOTS[$slot];
        $old = $vehicle->{$column};

        $vehicle->update([$column => $this->storePhoto($request->file('photo'))]);

        if ($old) {
            Storage::disk('public')->delete($old);
        }

        $this->toast("{$label} photo updated.");

        return back();
    }

    /** POST /driver/vehicles/{vehicle}/cor : upload or replace the Certificate of Registration (private disk). */
    public function cor(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $this->owned($request, $vehicle);

        $request->validate([
            'cor_image' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
        ], ['cor_image.required' => 'Choose a photo of the COR to upload.']);

        $old = $vehicle->cor_image_path;
        $vehicle->update(['cor_image_path' => $this->storeCor($request->file('cor_image'))]);

        if ($old) {
            Storage::disk('local')->delete($old);
        }

        $this->toast('COR updated.');

        return back();
    }

    /** PATCH /driver/vehicles/{vehicle}/description : the text panel under the banner. */
    public function description(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $this->owned($request, $vehicle);

        $data = $request->validate(['description' => ['nullable', 'string', 'max:500']]);
        $vehicle->update(['description' => filled($data['description'] ?? null) ? trim($data['description']) : null]);

        $this->toast('Description saved.');

        return back();
    }

    /** "Other": find or create the typed make + model (case-insensitive) and swap in its id. */
    private function withModel(array $data): array
    {
        if (($data['model_id'] ?? null) === 'other') {
            $make = VehicleMake::whereRaw('lower(name) = ?', [mb_strtolower($data['custom_make'])])->first()
                ?? VehicleMake::create(['name' => $data['custom_make']]);
            $model = VehicleModel::where('make_id', $make->id)->whereRaw('lower(name) = ?', [mb_strtolower($data['custom_model'])])->first()
                ?? VehicleModel::create(['make_id' => $make->id, 'name' => $data['custom_model']]);
            $data['model_id'] = $model->id;
        }

        unset($data['custom_make'], $data['custom_model']);

        return $data;
    }

    /** POST /driver/vehicles/{vehicle}/submit : the driver's final confirmation. Only now does the admin see it. */
    public function submit(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $this->owned($request, $vehicle);

        if (! in_array($vehicle->review_status, ['draft', 'rejected'], true)) {
            return back();
        }

        $missing = collect($vehicle->gallery())->filter(fn ($p) => ! $p['url'])->map(fn ($p) => strtolower($p['label']).' photo')
            ->when(! $vehicle->cor_image_path, fn ($c) => $c->push('COR'))
            ->when(! $vehicle->vin, fn ($c) => $c->push('VIN (use Edit)'));

        if ($missing->isNotEmpty()) {
            $this->toast('Still needed before you can submit: '.$missing->implode(', ').'.', 'error');

            return back();
        }

        $vehicle->forceFill(['review_status' => 'pending', 'review_remarks' => null])->save();
        $this->toast('Submitted. An admin will review your vehicle and you will be notified.');

        return back();
    }

    /** The moment this driver may register another vehicle, or null if they can now (2-minute spacing). */
    private function nextVehicleAt(int $driverId): ?CarbonInterface
    {
        $last = Vehicle::where('driver_id', $driverId)->latest('created_at')->value('created_at');
        $next = $last ? Carbon::parse($last)->addMinutes(2) : null;

        return $next && $next->isFuture() ? $next : null;
    }

    /** PRIVATE disk: no public URL exists; only the owner and admins can stream it. */
    private function storeCor(UploadedFile $file): string
    {
        return $file->storeAs('vehicle-cor', Str::uuid().'.'.$file->guessExtension(), 'local');
    }

    /** Public disk (photos are shown to passengers), random name, extension from the detected MIME type. */
    private function storePhoto(UploadedFile $file): string
    {
        return $file->storeAs('vehicles', Str::uuid().'.'.$file->guessExtension(), 'public');
    }

    /** Ownership check: 403 if the vehicle belongs to another driver (stops editing by guessing ids). */
    private function owned(Request $request, Vehicle $vehicle): void
    {
        abort_unless($vehicle->driver_id === $request->user()->id, 403);
    }
}
