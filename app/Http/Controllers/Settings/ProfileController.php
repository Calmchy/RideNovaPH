<?php

namespace App\Http\Controllers\Settings;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\IdType;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /** Show the profile page: editable info, verification status and role-specific settings. */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $latestId = $user->identityDocuments()->with('idType')->latest()->first();
        $driver = $user->driverProfile;

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'profile' => [
                'phone_number' => $user->phone_number,
                'address' => $user->address,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'role' => $user->role->name,
                'member_since' => $user->created_at->toIso8601String(),
            ],
            'verification' => [
                'id_status' => $latestId?->status->value,
                'id_remarks' => $latestId?->status === ApprovalStatus::Rejected ? $latestId->remarks : null,
                'driver_status' => $driver?->status->value,
                'driver_remarks' => $driver?->status === ApprovalStatus::Rejected ? $driver->remarks : null,
                'has_driver_profile' => $driver !== null,
            ],
            // The user's OWN uploads, shown back to them. URLs point at owner-only streaming routes.
            'documents' => [
                'id' => $latestId ? [
                    'type' => $latestId->idType->name,
                    'status' => $latestId->status->value,
                    'front' => "/settings/documents/id/front?v={$latestId->updated_at->timestamp}",
                    'back' => $latestId->back_image_path ? "/settings/documents/id/back?v={$latestId->updated_at->timestamp}" : null,
                ] : null,
                'licence' => $driver ? [
                    'status' => $driver->status->value,
                    'expiry' => $driver->license_expiry->toDateString(),
                    'front' => $driver->license_image_path ? "/settings/documents/licence/front?v={$driver->updated_at->timestamp}" : null,
                    'back' => $driver->license_back_image_path ? "/settings/documents/licence/back?v={$driver->updated_at->timestamp}" : null,
                ] : null,
                'vehicles' => $driver
                    ? $driver->vehicles()->with('model.make')->latest()->get()->map(fn ($v) => [
                        'id' => $v->id,
                        'name' => $v->model->make->name.' '.$v->model->name,
                        'plate_number' => $v->plate_number,
                        'cor_url' => $v->cor_image_path ? "/settings/documents/cor/{$v->id}?v={$v->updated_at->timestamp}" : null,
                    ])->values()
                    : [],
            ],
            'driver' => $user->isDriver() ? [
                'bio' => $driver?->bio,
                'allows_luggage' => $driver?->allows_luggage ?? true,
            ] : null,
            // For the ID upload form that lives inside the Verification panel.
            'id_types' => IdType::orderBy('name')->get(['id', 'name']),
            // Full history so a rejected user can see what was wrong each time.
            'id_history' => $user->identityDocuments()->with('idType')->latest()->limit(10)->get()->map(fn ($d) => [
                'id' => $d->id,
                'id_type' => $d->idType->name,
                'status' => $d->status->value,
                'remarks' => $d->remarks,
                'submitted_at' => $d->created_at->toIso8601String(),
            ]),
        ]);
    }

    /** Update the user's profile information (and driver-only settings for drivers). */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        // fill() honours #[Fillable], so role_id / account_status can never be changed here.
        $user->fill(collect($data)->only(['name', 'email', 'phone_number', 'address', 'emergency_contact_name', 'emergency_contact_phone'])->all());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        // Driver-only settings live on the driver profile (only if one exists).
        if ($user->isDriver() && $user->driverProfile) {
            $user->driverProfile->update([
                'bio' => $data['bio'] ?? null,
                'allows_luggage' => (bool) ($data['allows_luggage'] ?? false),
            ]);
        }

        $this->toast(__('Profile updated.'));

        return to_route('profile.edit');
    }

    /** POST /settings/profile/photo : the signed-in user changes THEIR OWN picture (public disk, shown in the app header). */
    public function photo(Request $request): RedirectResponse
    {
        $request->validate([
            'photo' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(3 * 1024)],
        ], ['photo.required' => 'Choose a photo to upload.']);

        $user = $request->user();
        $file = $request->file('photo');
        $old = $user->profile_photo_path;

        // Random name; extension from the detected MIME type, never from the user's filename.
        $user->forceFill([
            'profile_photo_path' => $file->storeAs('avatars', Str::uuid().'.'.$file->guessExtension(), 'public'),
        ])->save();

        if ($old) {
            Storage::disk('public')->delete($old);
        }

        $this->toast('Profile picture updated.');

        return back();
    }

    /** DELETE /settings/profile/photo */
    public function removePhoto(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
            $user->forceFill(['profile_photo_path' => null])->save();
        }

        $this->toast('Profile picture removed.');

        return back();
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        // Bookings / rides must keep their history (foreign keys), so accounts with activity can't be erased.
        if ($user->bookings()->exists() || $user->driverProfile?->vehicles()->exists()) {
            $this->toast('Accounts with trips or vehicles cannot be deleted. Contact support to close it.', 'error');

            return back();
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}