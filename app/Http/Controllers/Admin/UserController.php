<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AppNotice;
use App\Support\Like;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Admin > Users: search, filter, inspect, suspend / reactivate. */
class UserController extends Controller
{
    /** GET /admin/users?q=&role=&status= */
    public function index(Request $request): Response
    {
        $f = $request->validate([
            'q' => ['nullable', 'string', 'max:60'],
            'role' => ['nullable', 'in:admin,driver,passenger'],
            'status' => ['nullable', 'in:active,suspended'],
        ]);

        $users = User::with('role')
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w->where('name', 'like', Like::contains($v))->orWhere('email', 'like', Like::contains($v))))
            ->when($f['role'] ?? null, fn ($q, $v) => $q->whereHas('role', fn ($r) => $r->where('name', $v)))
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('account_status', $v))
            ->latest()->paginate(15)->withQueryString();

        return Inertia::render('admin/users', [
            'filters' => $f,
            'users' => $users->through(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone_number,
                'role' => $u->role->name,
                'status' => $u->account_status->value,
                'id_verified' => $u->hasApprovedId(),
                'joined' => $u->created_at->toIso8601String(),
                'is_self' => $u->id === auth()->id(),
            ]),
        ]);
    }

    /** GET /admin/users/{user} */
    public function show(User $user): Response
    {
        $user->load(['role', 'driverProfile.vehicles']);

        return Inertia::render('admin/user-show', [
            'user' => [
                'id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'phone' => $user->phone_number,
                'address' => $user->address, 'emergency_contact' => collect([$user->emergency_contact_name, $user->emergency_contact_phone])->filter()->implode(' · '),
                'role' => $user->role->name, 'status' => $user->account_status->value,
                'joined' => $user->created_at->toIso8601String(), 'id_verified' => $user->hasApprovedId(),
                'id_status' => $user->identityDocuments()->latest()->first()?->status->value,
                'driver_status' => $user->driverProfile?->status->value,
                'vehicles' => $user->driverProfile?->vehicles->map(fn ($v) => ['id' => $v->id, 'plate' => $v->plate_number, 'seats' => $v->seat_capacity]) ?? [],
                'bookings' => $user->bookings()->count(),
            ],
            'bookings' => $user->bookings()->with(['ride.origin', 'ride.destination'])->latest()->limit(10)->get()->map(fn ($b) => [
                'id' => $b->id, 'reference_no' => $b->reference_no, 'status' => $b->status->value,
                'route' => $b->ride->origin->name.' → '.$b->ride->destination->name,
            ]),
        ]);
    }

    /** PATCH /admin/users/{user} : suspend or reactivate. An admin can't lock themselves or other admins out. */
    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,suspended'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        abort_if($user->id === $request->user()->id || $user->role_id === Role::ADMIN, 403, 'Admin accounts cannot be suspended here.');

        $user->forceFill(['account_status' => AccountStatus::from($data['status'])])->save();

        // Kill the user's live sessions immediately (database session driver).
        if ($data['status'] === 'suspended') {
            \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $user->id)->delete();
        } else {
            $user->notify(new AppNotice('Account reactivated', 'Your RideNovaPH account is active again.'));
        }

        ActivityLog::record($request->user(), "user.{$data['status']}", $user, ['reason' => $data['reason'] ?? null]);
        $this->toast($data['status'] === 'suspended' ? 'User suspended.' : 'User reactivated.');

        return back();
    }

    /**
     * DELETE /admin/users/{user} : permanently remove an account.
     * Never yourself, never an admin. The database refuses if the person has trip, booking, rental or
     * vehicle history (that record must be kept), and then suspending is the right tool instead.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->id === $request->user()->id || $user->role_id === Role::ADMIN, 403, 'Admin accounts cannot be deleted here.');

        $who = ['name' => $user->name, 'email' => $user->email, 'role' => $user->role->name ?? null];

        try {
            DB::transaction(function () use ($user) {
                DB::table('sessions')->where('user_id', $user->id)->delete();
                DB::table('notifications')->where('notifiable_type', $user->getMorphClass())->where('notifiable_id', $user->id)->delete();
                $user->delete();
            });
        } catch (QueryException) {
            $this->toast('This user has rides, bookings, rentals or vehicles on record, so they can’t be deleted. Suspend the account instead.', 'warning');

            return back();
        }

        ActivityLog::record($request->user(), 'user.deleted', null, $who);
        $this->toast('User deleted.');

        return to_route('admin.users');
    }
}
