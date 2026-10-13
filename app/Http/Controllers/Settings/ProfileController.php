<?php

namespace App\Http\Controllers\Settings;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /** Show the profile page: editable info, verification status and role-specific settings. */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $latestId = $user->identityDocuments()->latest()->first();
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
            'driver' => $user->isDriver() ? [
                'bio' => $driver?->bio,
                'allows_luggage' => $driver?->allows_luggage ?? true,
            ] : null,
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
