<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Http\Requests\StoreIdentityDocumentRequest;
use App\Models\IdType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Validation\ValidationException;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AppNotice;

class IdentityDocumentController extends Controller
{
    /** GET /identity : upload form plus the current verification status. */
    public function create(Request $request): Response
    {
        $latest = $request->user()->identityDocuments()->latest()->first();

        return Inertia::render('identity/create', [
            'id_types' => IdType::orderBy('name')->get(['id', 'name']),
            'status' => $latest?->status->value,   // null | pending | approved | rejected
            'remarks' => $latest?->status === ApprovalStatus::Rejected ? $latest->remarks : null,
            // Full history so a rejected user can see what was wrong each time.
            'history' => $request->user()->identityDocuments()->with('idType')->latest()->limit(10)->get()->map(fn ($d) => [
                'id' => $d->id,
                'id_type' => $d->idType->name,
                'status' => $d->status->value,
                'remarks' => $d->remarks,
                'submitted_at' => $d->created_at->toIso8601String(),
            ]),
        ]);
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

        return to_route('identity.create');
    }
}
