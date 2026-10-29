<?php

namespace App\Actions\Charters;

use App\Enums\CharterStatus as S;
use App\Models\ActivityLog;
use App\Models\CharterRequest;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every state change of a charter request lives here, so the rules are in ONE place:
 *
 *   pending --quote--> quoted --accept--> accepted --complete--> completed
 *   pending|quoted --decline--> declined (driver)
 *   pending|quoted|accepted --cancel--> cancelled (either side, with a reason)
 *
 * Each change re-reads the row under a lock, so two clicks (or two tabs) can't both win.
 * WHO may do it is decided earlier by CharterRequestPolicy; WHEN it is legal is decided here.
 */
class AdvanceCharter
{
    /** The driver accepts the terms and names the price (they may re-quote while it is still open). */
    public function quote(CharterRequest $charter, User $driver, float $price, ?string $note): CharterRequest
    {
        if ($price <= 0 || $price > 500000) {
            throw ValidationException::withMessages(['price' => 'Enter a price between ₱1 and ₱500,000.']);
        }

        return $this->move($charter, [S::Pending, S::Quoted], $driver, 'charter.quoted', function (CharterRequest $c) use ($price, $note) {
            $c->forceFill([
                'status' => S::Quoted, 'quoted_price' => round($price, 2),
                'driver_note' => $note ? mb_substr($note, 0, 500) : null, 'quoted_at' => now(),
            ])->save();

            return [$c->passenger, 'Driver sent a price', "Your driver accepted your terms for {$c->reference_no} and quoted ₱".number_format($price, 2).'. Review and accept it.'];
        });
    }

    /** The passenger agrees to the driver's price: the trip is on. */
    public function accept(CharterRequest $charter, User $passenger): CharterRequest
    {
        return $this->move($charter, [S::Quoted], $passenger, 'charter.accepted', function (CharterRequest $c) {
            if ($c->pickup_at->isPast()) {
                throw ValidationException::withMessages(['status' => 'The pick-up time has already passed.']);
            }
            $c->forceFill(['status' => S::Accepted, 'accepted_at' => now()])->save();

            return [$c->driver, 'Price accepted', "The passenger accepted ₱".number_format((float) $c->quoted_price, 2)." for {$c->reference_no}. The trip is confirmed."];
        });
    }

    public function decline(CharterRequest $charter, User $driver, string $reason): CharterRequest
    {
        $this->needReason($reason);

        return $this->move($charter, [S::Pending, S::Quoted], $driver, 'charter.declined', function (CharterRequest $c) use ($reason) {
            $c->forceFill(['status' => S::Declined, 'reason' => mb_substr(trim($reason), 0, 255), 'closed_at' => now()])->save();

            return [$c->passenger, 'Request declined', "Your driver declined {$c->reference_no}: {$c->reason}"];
        });
    }

    public function cancel(CharterRequest $charter, User $actor, string $reason): CharterRequest
    {
        $this->needReason($reason);

        return $this->move($charter, [S::Pending, S::Quoted, S::Accepted], $actor, 'charter.cancelled', function (CharterRequest $c) use ($actor, $reason) {
            $c->forceFill(['status' => S::Cancelled, 'reason' => mb_substr(trim($reason), 0, 255), 'closed_at' => now()])->save();
            $other = $c->passenger_id === $actor->id ? $c->driver : $c->passenger;

            return [$other, 'Request cancelled', "{$actor->name} cancelled {$c->reference_no}: {$c->reason}"];
        });
    }

    /** Only after the pick-up time, so a driver can't "complete" a trip that hasn't happened. */
    public function complete(CharterRequest $charter, User $driver): CharterRequest
    {
        return $this->move($charter, [S::Accepted], $driver, 'charter.completed', function (CharterRequest $c) {
            if ($c->pickup_at->isFuture()) {
                throw ValidationException::withMessages(['status' => 'This trip has not started yet.']);
            }
            $c->forceFill(['status' => S::Completed, 'completed_at' => now()])->save();

            return [$c->passenger, 'Trip completed', "{$c->reference_no} was marked completed. Thank you for riding with RideNovaPH."];
        });
    }

    private function needReason(string $reason): void
    {
        if (mb_strlen(trim($reason)) < 5) {
            throw ValidationException::withMessages(['reason' => 'Please give a reason (at least 5 characters).']);
        }
    }

    /**
     * Lock, check the current status is allowed, run the change, log it, then notify the other side.
     * $change returns [User to notify, title, body].
     *
     * @param  list<S>  $from
     */
    private function move(CharterRequest $charter, array $from, User $actor, string $log, callable $change): CharterRequest
    {
        $notice = null;

        $locked = DB::transaction(function () use ($charter, $from, $change, &$notice) {
            $c = CharterRequest::with(['passenger', 'driver'])->whereKey($charter->id)->lockForUpdate()->firstOrFail();

            if (! in_array($c->status, $from, true)) {
                throw ValidationException::withMessages(['status' => "A {$c->status->value} request can't be changed this way."]);
            }

            $notice = $change($c);

            return $c;
        });

        ActivityLog::record($actor, $log, $locked);

        if ($notice) {
            [$to, $title, $body] = $notice;
            $to->notify(new AppNotice($title, $body, "/charters/{$locked->id}"));
        }

        return $locked;
    }
}
