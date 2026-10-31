<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\IdentityDocument;
use App\Notifications\AppNotice;
use App\Support\Like;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Admin > ID verification: review queue + history. Images live on the PRIVATE disk. */
class IdentityReviewController extends Controller
{
    /** GET /admin/identity?status=pending&q= */
    public function index(Request $request): Response
    {
        $f = $request->validate([
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'q' => ['nullable', 'string', 'max:60'],
            'role' => ['nullable', 'in:passenger,driver,admin'],
        ]);
        $status = $f['status'] ?? 'pending';

        $docs = IdentityDocument::with(['user:id,name,email,phone_number,address,emergency_contact_name,emergency_contact_phone,profile_photo_path,account_status,created_at,role_id', 'user.role', 'user.driverProfile', 'idType', 'reviewer:id,name'])
            ->where('status', $status)
            ->when($f['role'] ?? null, fn ($q, $v) => $q->whereHas('user.role', fn ($r) => $r->where('name', $v)))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', Like::contains($v))->orWhere('email', 'like', Like::contains($v))))
            ->oldest()->paginate(10)->withQueryString();

        return Inertia::render('admin/identity', [
            'filters' => ['status' => $status, 'q' => $f['q'] ?? null, 'role' => $f['role'] ?? null],
            'documents' => $docs->through(fn (IdentityDocument $d) => [
                'id' => $d->id,
                'name' => $d->user->name,
                'email' => $d->user->email,
                // The person being reviewed, so the admin can check the ID against who they say they are.
                'profile' => [
                    'user_id' => $d->user->id,
                    'photo' => $d->user->profile_photo_path ? Storage::disk('public')->url($d->user->profile_photo_path) : null,
                    'phone' => $d->user->phone_number,
                    'address' => $d->user->address,
                    'emergency' => collect([$d->user->emergency_contact_name, $d->user->emergency_contact_phone])->filter()->implode(' · ') ?: null,
                    'member_since' => $d->user->created_at->toIso8601String(),
                    'account_status' => $d->user->account_status->value,
                    'driver_status' => $d->user->driverProfile?->status->value,
                ],
                'role' => $d->user->role->name,
                'id_type' => $d->idType->name,
                'has_back' => $d->back_image_path !== null,
                'status' => $d->status->value,
                'remarks' => $d->remarks,
                'reviewer' => $d->reviewer?->name,
                'submitted_at' => $d->created_at->toIso8601String(),
            ]),
        ]);
    }

    /** GET /admin/identity-documents/{document}/{side} : stream the private image to an admin only. */
    public function image(Request $request, IdentityDocument $document, string $side): StreamedResponse
    {
        abort_unless(in_array($side, ['front', 'back'], true), 404);
        $path = $side === 'front' ? $document->front_image_path : $document->back_image_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        // Audit trail: who looked at whose ID, and when.
        Log::info('identity_document_viewed', ['admin_id' => $request->user()->id, 'document_id' => $document->id, 'side' => $side]);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** PATCH /admin/identity-documents/{document} : approve, or reject with a REQUIRED reason the user sees. */
    public function decide(Request $request, IdentityDocument $document): RedirectResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'remarks' => ['required_if:decision,rejected', 'nullable', 'string', 'max:255'],
        ], ['remarks.required_if' => 'Tell the user why the ID was rejected so they can fix it.']);

        abort_unless($document->status === ApprovalStatus::Pending, 409);

        $document->forceFill([
            'status' => $data['decision'],
            'remarks' => $data['decision'] === 'rejected' ? $data['remarks'] : null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        $document->user->notify(new AppNotice(
            $data['decision'] === 'approved' ? 'ID verified' : 'ID rejected',
            $data['decision'] === 'approved' ? 'Your ID is verified. You can now book rides.' : "Your ID was rejected. Reason: {$data['remarks']}. Please upload a new photo.",
            '/identity',
        ));
        ActivityLog::record($request->user(), "identity.{$data['decision']}", $document, ['remarks' => $data['remarks'] ?? null]);
        $this->toast("ID {$data['decision']}.");

        return back();
    }
}
