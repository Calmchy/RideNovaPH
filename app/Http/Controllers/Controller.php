<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;

abstract class Controller
{
    // Laravel 12's slim base controller has no authorize(); the policies need it.
    use AuthorizesRequests;

    /** One-shot toast shown by the existing Sonner/flash hook (same channel SecurityController uses). */
    protected function toast(string $message, string $type = 'success'): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }
}
