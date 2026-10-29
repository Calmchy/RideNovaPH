<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\DriverProfile;
use App\Models\Vehicle;
use App\Notifications\AppNotice;
use App\Support\Like;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Admin > Drivers: licence review (approve / reject with reason) and fleet overview. */
class DriverController extends Controller
{
    /** GET /admin/drivers?status=&q= */
    public function index(Request $request): Response
    {
        $f = $request->validate([
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'q' => ['nullable', 'string', 'max:60'],
        ]);

        $drivers = DriverProfile::with(['user:id,name,email,phone_number', 'vehicles.model.make'])
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('license_number', 'like', Like::contains($v))
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', Like::contains($v))->orWhere('email', 'like', Like::contains($v)))))
            ->orderByRaw("case status when 'pending' then 0 else 1 end")->latest()
            ->paginate(12)->withQueryString();

        return Inertia::render('admin/drivers', [
            'filters' => $f,
            'drivers' => $drivers->through(fn (DriverProfile $d) => [
                'id' => $d->user_id,
                'name' => $d->user->name,
                'email' => $d->user->email,
                'phone' => $d->user->phone_number,
                'has_license_back' => $d->license_back_image_path !== null,
                'cors' => $d->vehicles->filter(fn ($v) => $v->cor_image_path)->map(fn ($v) => ['id' => $v->id, 'plate' => $v->plate_number])->values()->all(),
                'license_number' => $d->license_number,
                'license_expiry' => $d->license_expiry->toDateString(),
                'expired' => $d->license_expiry->isPast(),
                'status' => $d->status->value,
                'remarks' => $d->remarks,
                'submitted_at' => $d->updated_at->toIso8601String(),
                'vehicles' => $d->vehicles->map(fn ($v) => $v->model->make->name.' '.$v->model->name.' · '.$v->plate_number)->all(),
            ]),
        ]);
    }

    /** GET /admin/drivers/{driver}/license/{side?} : stream a private licence photo (front by default) to admins only (audit logged). */
    public function license(Request $request, DriverProfile $driver, string $side = 'front'): StreamedResponse
    {
        $path = $side === 'back' ? $driver->license_back_image_path : $driver->license_image_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);
        Log::info('driver_license_viewed', ['admin_id' => $request->user()->id, 'driver_id' => $driver->user_id, 'side' => $side]);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** GET /admin/vehicles/{vehicle}/cor : stream the private COR photo to admins only (audit logged). */
    public function cor(Request $request, Vehicle $vehicle): StreamedResponse
    {
        abort_unless($vehicle->cor_image_path && Storage::disk('local')->exists($vehicle->cor_image_path), 404);
        Log::info('vehicle_cor_viewed', ['admin_id' => $request->user()->id, 'vehicle_id' => $vehicle->id]);

        return Storage::disk('local')->response($vehicle->cor_image_path, null, [
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** PATCH /admin/drivers/{driver} : approve, or reject WITH a reason the driver will see (then they can resubmit). */
    public function decide(Request $request, DriverProfile $driver): RedirectResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'remarks' => ['required_if:decision,rejected', 'nullable', 'string', 'max:255'],
        ], ['remarks.required_if' => 'Tell the driver why the licence was rejected.']);

        abort_unless($driver->status === ApprovalStatus::Pending, 409);

        if ($data['decision'] === 'approved' && $driver->license_expiry->isPast()) {
            $this->toast('This licence has already expired.', 'error');

            return back();
        }

        $driver->forceFill([
            'status' => $data['decision'],
            'remarks' => $data['decision'] === 'rejected' ? $data['remarks'] : null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        $driver->user->notify(new AppNotice(
            $data['decision'] === 'approved' ? 'Driver licence approved' : 'Driver licence rejected',
            $data['decision'] === 'approved' ? 'You can now register vehicles and publish rides.' : "Reason: {$data['remarks']}. Please upload a new photo.",
            '/driver/apply',
        ));
        ActivityLog::record($request->user(), "driver.{$data['decision']}", $driver, ['remarks' => $data['remarks'] ?? null]);
        $this->toast("Licence {$data['decision']}.");

        return back();
    }
}
