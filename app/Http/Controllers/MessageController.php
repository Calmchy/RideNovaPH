<?php

namespace App\Http\Controllers;

use App\Models\DirectMessage;
use App\Models\User;
use App\Notifications\AppNotice;
use App\Support\DirectChat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Direct messages between a passenger and a driver.
 * "Real time" = the chat box asks for new messages every few seconds (same approach as the charter chat).
 */
class MessageController extends Controller
{
    /** GET /messages : my conversations, newest first. */
    public function index(Request $request): Response
    {
        $me = $request->user();

        // Plain integer written into the SQL text (not a ? binding): MySQL's ONLY_FULL_GROUP_BY cannot tell that
        // a bound value in SELECT and in GROUP BY are the same, so the two expressions must match exactly.
        $id = (int) $me->id;

        $latest = DirectMessage::query()
            ->where(fn ($q) => $q->where('sender_id', $id)->orWhere('recipient_id', $id))
            ->selectRaw("CASE WHEN sender_id = {$id} THEN recipient_id ELSE sender_id END AS partner_id, MAX(id) AS last_id")
            ->groupByRaw("CASE WHEN sender_id = {$id} THEN recipient_id ELSE sender_id END")
            ->orderByDesc('last_id')->limit(50)->get();

        $people = User::whereIn('id', $latest->pluck('partner_id'))->get(['id', 'name', 'last_seen_at'])->keyBy('id');
        $last = DirectMessage::whereIn('id', $latest->pluck('last_id'))->get()->keyBy('id');
        $unread = DirectMessage::where('recipient_id', $me->id)->whereNull('read_at')
            ->selectRaw('sender_id, COUNT(*) AS n')->groupBy('sender_id')->pluck('n', 'sender_id');

        return Inertia::render('messages/index', [
            'conversations' => $latest->map(function ($row) use ($people, $last, $unread, $me) {
                $m = $last[$row->last_id];

                return [
                    'user_id' => (int) $row->partner_id,
                    'name' => $people[$row->partner_id]->name ?? 'User',
                    'online' => isset($people[$row->partner_id]) && DirectChat::isOnline($people[$row->partner_id]),
                    'preview' => mb_strimwidth($m->body, 0, 80, '…'),
                    'mine' => $m->sender_id === $me->id,
                    'at' => $m->created_at->toIso8601String(),
                    'unread' => (int) ($unread[$row->partner_id] ?? 0),
                ];
            })->values(),
        ]);
    }

    /** GET /messages/{user} : one conversation (full page). */
    public function show(Request $request, User $user): Response
    {
        $me = $request->user();
        abort_unless(DirectChat::canOpen($me, $user), 403);

        DirectChat::markRead($me, $user);

        return Inertia::render('messages/show', [
            'partner' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone_number,
                'is_driver' => DirectChat::isVerifiedDriver($user),
            ] + DirectChat::presence($user),
            'messages' => DirectChat::thread($me, $user),
            'can_send' => DirectChat::canSend($me, $user),
        ]);
    }

    /** GET /messages/{user}/chat?after=ID : the chat poll (JSON). */
    public function poll(Request $request, User $user): JsonResponse
    {
        $me = $request->user();
        abort_unless(DirectChat::canOpen($me, $user), 403);

        $messages = DirectChat::thread($me, $user, (int) $request->query('after', 0));
        DirectChat::markRead($me, $user);

        return response()->json([
            'messages' => $messages,
            'statuses' => DirectChat::statuses($me, $user),
            'partner' => DirectChat::presence($user),
        ])->header('Cache-Control', 'no-store, private');
    }

    /** POST /messages/{user}/chat : send one message (JSON). */
    public function send(Request $request, User $user): JsonResponse
    {
        $me = $request->user();
        abort_unless(DirectChat::canSend($me, $user), 403, 'You can only message verified drivers, or people who wrote to you.');

        $body = trim(strip_tags((string) $request->input('body')));
        abort_if($body === '' || mb_strlen($body) > DirectChat::MAX_LENGTH, 422, 'Write a message of 1 to 500 characters.');

        // Notify only when the conversation changes hands (not once per message).
        $previous = DirectChat::between($me, $user)->latest('id')->first();
        // "Delivered" right away when the other person is online; otherwise it stays "Sent" until they show up.
        $message = DirectMessage::create([
            'sender_id' => $me->id,
            'recipient_id' => $user->id,
            'body' => $body,
            'delivered_at' => DirectChat::isOnline($user) ? now() : null,
        ]);

        if (! $previous || $previous->sender_id !== $me->id) {
            $user->notify(new AppNotice('New message', "{$me->name} sent you a message.", "/messages/{$me->id}"));
        }

        return response()->json(['message' => DirectChat::present($message->load('sender:id,name'), $me)], 201);
    }
}
