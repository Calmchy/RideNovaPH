<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Http\Requests\StoreDriverApplicationRequest;
use App\Models\ActivityLog;
use App\Models\DriverProfile;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Driver licence verification (first submission AND resubmission after a rejection).
 * The licence photo goes to the PRIVATE disk; only admins can view it.
 */
class DriverApplicationController extends Controller
{
    /** GET /driver/apply */
    public function create(Request $request): Response
    {
        $profile = $request->user()->driverProfile;

        return Inertia::render('driver/apply', [
            'status' => $profile?->status->value,
            'remarks' => $profile?->status === ApprovalStatus::Rejected ? $profile->remarks : null,
            'license_number' => $profile?->license_number,
            'license_expiry' => $profile?->license_expiry?->toDateString(),
        ]);
    }

    /** POST /driver/apply : create the profile, or replace a REJECTED one (status goes back to pending). */
    public function store(StoreDriverApplicationRequest $request): RedirectResponse
    {
        $user = $request->user();
        $profile = $user->driverProfile;

        // One live submission at a time: block while pending or already approved.
        if ($profile && $profile->status !== ApprovalStatus::Rejected) {
            $this->toast('Your licence is already '.$profile->status->value.'.', 'warning');

            return to_route('driver.apply');
        }

        $file = $request->file('license_image');
        // Random name on the private 'local' disk; extension from the detected MIME type, never from the user's filename.
        $path = $file->storeAs('driver-licenses', Str::uuid().'.'.$file->guessExtension(), 'local');

        if ($profile?->license_image_path) {
            Storage::disk('local')->delete($profile->license_image_path); // old rejected photo
        }

        DriverProfile::updateOrCreate(['user_id' => $user->id], [
            'license_number' => $request->validated('license_number'),
            'license_expiry' => $request->validated('license_expiry'),
            'license_image_path' => $path,
            'status' => ApprovalStatus::Pending,
            'remarks' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);

        ActivityLog::record($user, 'driver.licence_submitted');
        $this->toast('Licence submitted. An admin will review it shortly.');

        return to_route('driver.apply');
    }
}
