<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Admin > Settings: platform fee, cancellation cut-off, seat limit, ID rule, support email. */
class SettingController extends Controller
{
    /** GET /admin/settings */
    public function edit(): Response
    {
        return Inertia::render('admin/settings', [
            'settings' => Setting::all_(),
            'recent_activity' => ActivityLog::with('actor:id,name')->latest()->limit(10)->get()->map(fn ($a) => [
                'id' => $a->id, 'action' => $a->action, 'actor' => $a->actor?->name, 'at' => $a->created_at->toIso8601String(),
            ]),
        ]);
    }

    /** PUT /admin/settings : whitelisted keys only; every value validated. */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'platform_fee_percent' => ['required', 'numeric', 'between:0,50'],
            'cancellation_cutoff_hours' => ['required', 'integer', 'between:0,72'],
            'max_seats_per_booking' => ['required', 'integer', 'between:1,20'],
            'max_active_bookings' => ['required', 'integer', 'between:0,20'],
            'booking_min_gap_hours' => ['required', 'integer', 'between:0,48'],
            'cancel_strike_limit' => ['required', 'integer', 'between:0,20'],
            'cancel_strike_days' => ['required', 'integer', 'between:1,365'],
            'cancellation_fee_percent' => ['required', 'numeric', 'between:0,100'],
            'require_id_for_booking' => ['required', 'boolean'],
            'support_email' => ['required', 'email', 'max:190'],
        ]);

        foreach ($data as $key => $value) {
            Setting::put($key, is_bool($value) ? ($value ? '1' : '0') : (string) $value);
        }

        ActivityLog::record($request->user(), 'settings.updated', null, $data);
        $this->toast('Settings saved. The new platform fee applies to NEW bookings only.');

        return back();
    }
}
