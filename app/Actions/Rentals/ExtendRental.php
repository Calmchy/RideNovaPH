<?php

namespace App\Actions\Rentals;

use App\Enums\RentalStatus;
use App\Models\ActivityLog;
use App\Models\RentalExtension;
use App\Models\RentalRequest;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Extending an approved rental.
 *  - The renter asks for N more days, at least NOTICE_HOURS before the current return time.
 *  - The owner accepts (return time, days and total move) or declines (with a reason).
 * The extra price is the rental's own daily rate x the extra days: never typed by anyone.
 */
class ExtendRental
{
    /** The owner must be told at least this many hours before the vehicle is due back. */
    public const NOTICE_HOURS = 72;

    /** Latest moment a renter may still ask for an extension of this rental. */
    public static function deadline(RentalRequest $rental): \Carbon\CarbonInterface
    {
        return $rental->end_at->copy()->subHours(self::NOTICE_HOURS);
    }

    public function request(RentalRequest $rental, User $renter, int $days): RentalExtension
    {
        $extension = DB::transaction(function () use ($rental, $renter, $days) {
            $vehicleId = RentalRequest::whereKey($rental->id)->value('vehicle_id');
            \App\Models\Vehicle::whereKey($vehicleId)->lockForUpdate()->first();
            $r = RentalRequest::whereKey($rental->id)->lockForUpdate()->firstOrFail();

            if ($r->renter_id !== $renter->id) {
                abort(403);
            }
            if ($r->status !== RentalStatus::Approved) {
                throw ValidationException::withMessages(['days' => 'Only an approved rental can be extended.']);
            }
            if (now()->gt(self::deadline($r))) {
                throw ValidationException::withMessages(['days' => 'Extensions must be requested at least '.self::NOTICE_HOURS.' hours before the return time. Please contact the owner.']);
            }
            if (RentalExtension::where('rental_request_id', $r->id)->where('status', 'pending')->exists()) {
                throw ValidationException::withMessages(['days' => 'You already have an extension waiting for the owner.']);
            }
            if ($r->days + $days > RequestRental::MAX_DAYS) {
                throw ValidationException::withMessages(['days' => 'A rental can last at most '.RequestRental::MAX_DAYS.' days in total.']);
            }

            $newEnd = $r->end_at->copy()->addDays($days);

            if (AdvanceRental::overlaps($r->vehicle_id, $r->end_at, $newEnd, $r->id)) {
                throw ValidationException::withMessages(['days' => 'The vehicle is already reserved by someone else right after your return time.']);
            }

            return RentalExtension::create([
                'rental_request_id' => $r->id,
                'days' => $days,
                'extra_price' => round((float) $r->daily_rate * $days, 2),
                'old_end_at' => $r->end_at,
                'new_end_at' => $newEnd,
                'status' => 'pending',
            ]);
        });

        ActivityLog::record($renter, 'rental.extension_requested', $rental);
        $rental->owner->notify(new AppNotice(
            'Extension request',
            "{$renter->name} asks to extend {$rental->reference_no} by {$days} day(s). Please accept or decline.",
            "/rentals/{$rental->id}",
        ));

        return $extension;
    }

    public function approve(RentalExtension $extension, User $owner): RentalExtension
    {
        $rental = null;

        $done = DB::transaction(function () use ($extension, $owner, &$rental) {
            $e = RentalExtension::whereKey($extension->id)->lockForUpdate()->firstOrFail();
            $vehicleId = RentalRequest::whereKey($e->rental_request_id)->value('vehicle_id');
            \App\Models\Vehicle::whereKey($vehicleId)->lockForUpdate()->first();
            $r = RentalRequest::with('renter')->whereKey($e->rental_request_id)->lockForUpdate()->firstOrFail();

            if ($r->owner_id !== $owner->id) {
                abort(403);
            }
            if ($e->status !== 'pending') {
                throw ValidationException::withMessages(['status' => 'This extension was already answered.']);
            }
            if ($r->status !== RentalStatus::Approved || $r->end_at->isPast()) {
                throw ValidationException::withMessages(['status' => 'This rental can no longer be extended.']);
            }
            if (AdvanceRental::overlaps($r->vehicle_id, $r->end_at, $e->new_end_at, $r->id)) {
                throw ValidationException::withMessages(['status' => 'You already approved another rental for some of these dates.']);
            }

            $e->forceFill(['status' => 'approved', 'decided_at' => now()])->save();
            $r->forceFill([
                'end_at' => $e->new_end_at,
                'days' => $r->days + $e->days,
                'total_price' => round((float) $r->total_price + (float) $e->extra_price, 2),
            ])->save();
            $rental = $r;

            return $e;
        });

        ActivityLog::record($owner, 'rental.extension_approved', $rental);
        $rental->renter->notify(new AppNotice(
            'Extension accepted',
            "The owner accepted {$done->days} more day(s) for {$rental->reference_no}. New return time: ".$done->new_end_at->format('M j, Y g:i A').'.',
            "/rentals/{$rental->id}",
        ));

        return $done;
    }

    public function decline(RentalExtension $extension, User $owner, string $reason): RentalExtension
    {
        if (mb_strlen(trim($reason)) < 5) {
            throw ValidationException::withMessages(['reason' => 'Please give a reason (at least 5 characters).']);
        }
        $rental = null;

        $done = DB::transaction(function () use ($extension, $owner, $reason, &$rental) {
            $e = RentalExtension::whereKey($extension->id)->lockForUpdate()->firstOrFail();
            $r = RentalRequest::with('renter')->whereKey($e->rental_request_id)->firstOrFail();

            if ($r->owner_id !== $owner->id) {
                abort(403);
            }
            if ($e->status !== 'pending') {
                throw ValidationException::withMessages(['status' => 'This extension was already answered.']);
            }

            $e->forceFill(['status' => 'declined', 'reason' => mb_substr(trim($reason), 0, 255), 'decided_at' => now()])->save();
            $rental = $r;

            return $e;
        });

        ActivityLog::record($owner, 'rental.extension_declined', $rental);
        $rental->renter->notify(new AppNotice(
            'Extension declined',
            "The owner declined the extension for {$rental->reference_no}: {$done->reason}. Please return the vehicle on time.",
            "/rentals/{$rental->id}",
        ));

        return $done;
    }
}
