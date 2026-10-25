<?php

namespace App\Http\Controllers;

use App\Models\ChatbotIntent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** POST /chatbot : "Nova", the rule-based help bot. No external AI service, no data leaves the server. */
class ChatbotController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['message' => ['required', 'string', 'max:300']]);
        $text = mb_strtolower($data['message']);

        // A personal answer for signed-in users asking about their own bookings.
        if ($request->user() && preg_match('/\b(my|akong|ang akon)\b.*\b(booking|bookings|reservation|trip)\b/u', $text)) {
            $latest = $request->user()->bookings()->with('ride.origin', 'ride.destination')->latest()->first();

            return response()->json(['reply' => $latest
                ? "Your latest booking is {$latest->reference_no} ({$latest->ride->origin->name} → {$latest->ride->destination->name}), status: {$latest->status->value}. Open Bookings to manage it."
                : "You don't have any bookings yet. Open Bookings → Find a ride to reserve a seat."]);
        }

        return response()->json([
            'reply' => ChatbotIntent::replyFor($data['message'])
                ?? "I'm not sure about that yet. Try asking about booking, ID verification, payment, cancellation or safety, or email support.",
        ]);
    }
}
