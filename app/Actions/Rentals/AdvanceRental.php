<?php

namespace App\Actions\Rentals;

use App\Enums\RentalStatus as S;
use App\Models\ActivityLog;
use App\Models\RentalRequest;
use App\Models\User;
use App\Notifications\AppNotice;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every state change of a rental request, in one place:
 *
 *   pending --approve--> approved --complete--> completed
 *   pending --decline--> declined (owner)
 *   pending|approved --cancel--> cancelled (either side, with a reason)
 *
 * Rows are re-read under a lock, so two clicks / two tabs can't both win.
 * WHO may act is the policy's job; WHEN it is legal is decided here.
 */
class AdvanceRental
{
    /** Is the vehicle already promised (approved) to someone else in this window? Touching edges are fine. */
    public static function overlaps(int $vehicleId, CarbonInterface $start, CarbonInterface $end, ?int $exceptId = null): bool
    {
        return RentalRequest::where('vehicle_id', $vehicleId)
            ->where('status', S::Approved->value)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->where('start_at', '<', $end)->where('end_at', '>', $start)
            ->exists();
    }

    public function approve(RentalRequest $rental, User $owner, ?string $note): RentalRequest
    {
        return $this->move($rental, [S::Pending], $owner, 'rental.approved', function (RentalRequest $r) use ($note) {
            if ($r->start_at->isPast()) {
                throw ValidationException::withMessages(['status' => 'The start time has already passed.']);
            }
            if (self::overlaps($r->vehicle_id, $r->start_at, $r->end_at, $r->id)) {
                throw ValidationException::withMessages(['status' => 'You already approved another rental for some of these dates.']);
            }
            $r->forceFill([
                'status' => S::Approved, 'approved_at' => now(),
                'owner_note' => $note ? mb_substr($note, 0, 500) : null,
            ])->save();

            return [$r->renter, 'Rental approved', "{$r->reference_no} is approved at ₱".number_format((float) $r->total_price, 2).' for '.$r->days.' day(s). Pay the owner in cash at pick-up.'];
        }, true);
    }

    public function decline(RentalRequest $rental, User $owner, string $reason): RentalRequest
    {
        $this->needReason($reason);

        return $this->move($rental, [S::Pending], $owner, 'rental.declined', function (RentalRequest $r) use ($reason) {
            $r->forceFill(['status' => S::Declined, 'reason' => mb_substr(trim($reason), 0, 255), 'closed_at' => now()])->save();

            return [$r->renter, 'Rental declined', "The owner declined {$r->reference_no}: {$r->reason}"];
        });
    }

    public function cancel(RentalRequest $rental, User $actor, string $reason): RentalRequest
    {
        $this->needReason($reason);

        return $this->move($rental, [S::Pending, S::Approved], $actor, 'rental.cancelled', function (RentalRequest $r) use ($actor, $reason) {
            $r->forceFill(['status' => S::Cancelled, 'reason' => mb_substr(trim($reason), 0, 255), 'closed_at' => now()])->save();
            $other = $r->renter_id === $actor->id ? $r->owner : $r->renter;

            return [$other, 'Rental cancelled', "{$actor->name} cancelled {$r->reference_no}: {$r->reason}"];
        });
    }

    /** Owner confirms the vehicle is back. Only once the rental has started. */
    public function complete(RentalRequest $rental, User $owner): RentalRequest
    {
        return $this->move($rental, [S::Approved], $owner, 'rental.completed', function (RentalRequest $r) {
            if ($r->start_at->isFuture()) {
                throw ValidationException::withMessages(['status' => 'This rental has not started yet.']);
            }
            $r->forceFill(['status' => S::Completed, 'completed_at' => now()])->save();

            return [$r->renter, 'Rental completed', "{$r->reference_no} was marked returned. Thank you for renting with RideNovaPH."];
        });
    }

    private function needReason(string $reason): void
    {
        if (mb_strlen(trim($reason)) < 5) {
            throw ValidationException::withMessages(['reason' => 'Please give a reason (at least 5 characters).']);
        }
    }

    /**
     * @param  list<S>  $from
     * @param  bool  $lockVehicle  also lock the vehicle row (approving must not race another approval)
     */
    private function move(RentalRequest $rental, array $from, User $actor, string $log, callable $change, bool $lockVehicle = false): RentalRequest
    {
        $notice = null;

        $locked = DB::transaction(function () use ($rental, $from, $change, $lockVehicle, &$notice) {
            $r = RentalRequest::with(['renter', 'owner'])->whereKey($rental->id)->lockForUpdate()->firstOrFail();

            if ($lockVehicle) {
                \App\Models\Vehicle::whereKey($r->vehicle_id)->lockForUpdate()->first();
            }
            if (! in_array($r->status, $from, true)) {
                throw ValidationException::withMessages(['status' => "A {$r->status->value} request can't be changed this way."]);
            }

            $notice = $change($r);

            return $r;
        });

        ActivityLog::record($actor, $log, $locked);

        if ($notice) {
            [$to, $title, $body] = $notice;
            $to->notify(new AppNotice($title, $body, "/rentals/{$locked->id}"));
        }

        return $locked;
    }
}
