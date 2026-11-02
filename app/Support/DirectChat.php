<?php

namespace App\Support;

use App\Http\Controllers\DriverDirectoryController;
use App\Models\DirectMessage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

/**
 * Rules and helpers for the one-to-one chat between a passenger and a driver.
 *
 * Who may write to whom (so nobody can message strangers):
 *  - anyone signed in may message a VERIFIED driver;
 *  - a driver may answer a person who already wrote to them.
 */
class DirectChat
{
    public const MAX_LENGTH = 500;

    /** A person counts as online if they had the site open within this many seconds. */
    public const ONLINE_SECONDS = 120;

    /** Every message between the two people, in both directions. */
    public static function between(User $a, User $b): Builder
    {
        return DirectMessage::query()->where(fn ($q) => $q
            ->where(fn ($w) => $w->where('sender_id', $a->id)->where('recipient_id', $b->id))
            ->orWhere(fn ($w) => $w->where('sender_id', $b->id)->where('recipient_id', $a->id)));
    }

    public static function isVerifiedDriver(User $user): bool
    {
        return DriverDirectoryController::verifiedDrivers()->where('user_id', $user->id)->exists();
    }

    public static function canSend(User $from, User $to): bool
    {
        if ($from->id === $to->id) {
            return false;
        }

        if (self::isVerifiedDriver($to)) {
            return true;
        }

        return $from->isApprovedDriver()
            && DirectMessage::where('sender_id', $to->id)->where('recipient_id', $from->id)->exists();
    }

    /** May this person open the conversation at all? (Sending allowed, or it already has history.) */
    public static function canOpen(User $me, User $other): bool
    {
        return $me->id !== $other->id
            && (self::canSend($me, $other) || self::between($me, $other)->exists());
    }

    /**
     * Messages of the conversation, oldest first.
     * With $after = 0 you get the latest $limit; with $after > 0 only the newer ones (the poll).
     *
     * @return list<array<string, mixed>>
     */
    public static function thread(User $me, User $other, int $after = 0, int $limit = 100): array
    {
        $query = self::between($me, $other)->with('sender:id,name');

        $rows = $after > 0
            ? $query->where('id', '>', $after)->orderBy('id')->limit(200)->get()
            : $query->orderByDesc('id')->limit($limit)->get()->reverse()->values();

        return $rows->map(fn (DirectMessage $m) => self::present($m, $me))->all();
    }

    /** Opening the chat means the messages reached the device (delivered) and were read (seen). */
    public static function markRead(User $me, User $other): void
    {
        $waiting = DirectMessage::where('sender_id', $other->id)->where('recipient_id', $me->id);

        (clone $waiting)->whereNull('delivered_at')->update(['delivered_at' => now()]);
        (clone $waiting)->whereNull('read_at')->update(['read_at' => now()]);
    }

    public static function lastSeen(User $user): ?Carbon
    {
        return $user->last_seen_at ? Carbon::parse($user->last_seen_at) : null;
    }

    public static function isOnline(User $user): bool
    {
        $seen = self::lastSeen($user);

        return $seen !== null && $seen->gt(now()->subSeconds(self::ONLINE_SECONDS));
    }

    /** @return array{online: bool, last_seen: string|null} */
    public static function presence(User $user): array
    {
        return ['online' => self::isOnline($user), 'last_seen' => self::lastSeen($user)?->toIso8601String()];
    }

    /** sent = saved; delivered = reached their device (they were online); seen = they opened it. */
    public static function status(DirectMessage $m): string
    {
        return $m->read_at ? 'seen' : ($m->delivered_at ? 'delivered' : 'sent');
    }

    /**
     * The latest status of my last few messages to this person (the poll uses it to update old bubbles).
     *
     * @return array<int, string>
     */
    public static function statuses(User $me, User $other): array
    {
        return DirectMessage::where('sender_id', $me->id)->where('recipient_id', $other->id)
            ->orderByDesc('id')->limit(30)->get()
            ->mapWithKeys(fn (DirectMessage $m) => [$m->id => self::status($m)])->all();
    }

    /** @return array<string, mixed> */
    public static function present(DirectMessage $m, User $viewer): array
    {
        return [
            'id' => $m->id,
            'mine' => $m->sender_id === $viewer->id,
            'name' => $m->sender?->name ?? 'User',
            'body' => $m->body,
            'at' => $m->created_at->toIso8601String(),
            // Only my own messages carry a status (Sent / Delivered / Seen).
            'status' => $m->sender_id === $viewer->id ? self::status($m) : null,
        ];
    }

    public static function unreadCount(User $me): int
    {
        return DirectMessage::where('recipient_id', $me->id)->whereNull('read_at')->count();
    }
}
