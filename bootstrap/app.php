<?php

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureDriver;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);
        $middleware->alias([
            'admin' => EnsureAdmin::class,
            'driver' => EnsureDriver::class,
        ]);

        // Check the role BEFORE route-model binding: a non-admin asking for /admin/.../99 must get
        // 403 whether or not record 99 exists, so the answer can't be used to probe for ids.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureAdmin::class);
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureDriver::class);

        $middleware->web(append: [
            HandleAppearance::class,
            \App\Http\Middleware\EnsureActiveAccount::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();