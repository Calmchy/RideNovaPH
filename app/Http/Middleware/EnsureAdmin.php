<?php

namespace App\Http\Middleware;

use App\Enums\AccountStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate for every /admin route. Role is read from the DB-backed user model on each
 * request (never from the client), and suspended admins are locked out too.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless(
            $user && $user->isAdmin() && $user->account_status === AccountStatus::Active,
            403,
        );

        return $next($request);
    }
}
