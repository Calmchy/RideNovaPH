<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Gate for /driver/*: the role is read from the database user on every request. */
class EnsureDriver
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->isDriver(), 403, 'This area is for drivers.');

        return $next($request);
    }
}
