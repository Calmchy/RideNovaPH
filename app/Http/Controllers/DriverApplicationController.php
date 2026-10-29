<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Http\Requests\StoreDriverApplicationRequest;
use App\Models\ActivityLog;
use App\Models\DriverProfile;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
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

        $path = $this->storeLicence($request->file('license_image'));
        $backPath = $this->storeLicence($request->file('license_back_image'));

        foreach ([$profile?->license_image_path, $profile?->license_back_image_path] as $old) {
            if ($old) {
                Storage::disk('local')->delete($old); // old rejected photos
            }
        }

        DriverProfile::updateOrCreate(['user_id' => $user->id], [
            'license_number' => $request->validated('license_number'),
            'license_expiry' => $request->validated('license_expiry'),
            'license_image_path' => $path,
            'license_back_image_path' => $backPath,
            'status' => ApprovalStatus::Pending,
            'remarks' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);

        ActivityLog::record($user, 'driver.licence_submitted');
        $this->toast('Licence submitted. An admin will review it shortly.');

        return to_route('driver.apply');
    }

    /**
     * POST /driver/license/photos : replace the FRONT and/or BACK licence photo in one request
     * (fix a blurry or wrong upload, or add the back to a licence submitted before the back was required).
     * A PENDING licence stays pending. An APPROVED licence goes back to pending for a fresh admin check,
     * so a verified licence can never be swapped for a different photo without review.
     * A REJECTED licence is fixed through the normal "Resubmit licence" form instead.
     */
    public function replacePhotos(Request $request): RedirectResponse
    {
        $profile = $request->user()->driverProfile;
        abort_unless($profile, 403, 'Submit your driver licence first.');

        if ($profile->status === ApprovalStatus::Rejected) {
            $this->toast('Your licence was rejected. Use “Resubmit licence” to upload new photos.', 'warning');

            return back();
        }

        $image = File::image()->types(['jpg', 'jpeg', 'png'])->max(4 * 1024);
        $request->validate([
            'front_photo' => ['required_without:back_photo', 'nullable', $image],
            'back_photo' => ['required_without:front_photo', 'nullable', $image],
        ], [
            'front_photo.required_without' => 'Choose at least one new photo.',
            'back_photo.required_without' => 'Choose at least one new photo.',
        ]);

        $wasApproved = $profile->status === ApprovalStatus::Approved;
        $changes = [];
        $replaced = [];

        foreach (['front_photo' => 'license_image_path', 'back_photo' => 'license_back_image_path'] as $field => $column) {
            if ($file = $request->file($field)) {
                $replaced[] = $profile->{$column};
                $changes[$column] = $this->storeLicence($file);
            }
        }

        $profile->forceFill($changes + [
            'status' => ApprovalStatus::Pending,
            'remarks' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ])->save();

        foreach (array_filter($replaced) as $old) {
            Storage::disk('local')->delete($old);
        }

        ActivityLog::record($request->user(), 'driver.licence_photos_replaced', $profile, ['sides' => array_keys($changes)]);

        if ($wasApproved) {
            User::where('role_id', Role::ADMIN)->get()->each->notify(
                new AppNotice('Licence to re-check', "{$request->user()->name} replaced licence photos.", '/admin/drivers?status=pending'),
            );
            $this->toast('Photos replaced. An admin will re-check your licence.');
        } else {
            $this->toast('Photos replaced.');
        }

        return back();
    }

    /** Random name on the private 'local' disk; extension from the detected MIME type, never from the user's filename. */
    private function storeLicence(UploadedFile $file): string
    {
        return $file->storeAs('driver-licenses', Str::uuid().'.'.$file->guessExtension(), 'local');
    }
}
