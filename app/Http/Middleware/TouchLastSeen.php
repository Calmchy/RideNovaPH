<?php

namespace App\Http\Middleware;

use App\Models\DirectMessage;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Remembers when a signed-in person last had the site open ("online" = seen in the last 2 minutes),
 * and marks messages that were waiting for them as delivered. Writes at most once per 30 seconds
 * per person, so it costs almost nothing.
 */
class TouchLastSeen
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && Cache::add("seen-write:{$user->id}", 1, 30)) {
            DB::table('users')->where('id', $user->id)->update(['last_seen_at' => now()]);
            DirectMessage::where('recipient_id', $user->id)->whereNull('delivered_at')->update(['delivered_at' => now()]);
        }

        return $next($request);
    }
}
