<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Http\Requests\StoreIdentityDocumentRequest;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class IdentityDocumentController extends Controller
{
    /**
     * GET /identity : the form now lives on the profile page (Settings > Profile > Verification),
     * so old links, emails and notifications simply land there.
     */
    public function create(Request $request): RedirectResponse
    {
        $request->session()->reflash(); // keep any toast set just before this redirect

        return to_route('profile.edit');
    }

    /** POST /identity : attach a valid ID picture. Stored on the PRIVATE disk, admin-only to view. */
    public function store(StoreIdentityDocumentRequest $request): RedirectResponse
    {
        $user = $request->user();

        // One live submission at a time: block while pending, and when already approved.
        if ($user->identityDocuments()->whereIn('status', [ApprovalStatus::Pending->value, ApprovalStatus::Approved->value])->exists()) {
            throw ValidationException::withMessages(['front_image' => 'You already have an ID pending review or approved.']);
        }

        $front = $request->file('front_image');
        $back = $request->file('back_image');

        $user->identityDocuments()->create([
            'id_type_id' => $request->integer('id_type_id'),
            // Random names on the 'local' disk (storage/app/private): no public URL exists.
            // The extension comes from the detected MIME type, never from the user's filename.
            'front_image_path' => $front->storeAs('identity-documents', Str::uuid().'.'.$front->guessExtension(), 'local'),
            'back_image_path' => $back?->storeAs('identity-documents', Str::uuid().'.'.$back->guessExtension(), 'local'),
        ]);

        User::where('role_id', Role::ADMIN)->get()->each->notify(
            new AppNotice('ID to review', "{$user->name} submitted a valid ID.", '/admin/identity?status=pending'),
        );

        $this->toast('ID submitted. An admin will review it shortly.');

        return to_route('profile.edit');
    }
}