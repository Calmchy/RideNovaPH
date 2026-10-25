<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Props shared with EVERY page. Only whitelisted, non-sensitive fields go here.
     * Notification data is lazy (closures): it is only queried on pages that read it.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                // These flags only decide which menu items to SHOW. The server re-checks every request.
                'isAdmin' => (bool) $user?->isAdmin(),
                'isDriver' => (bool) $user?->isDriver(),
                'driverApproved' => (bool) $user?->isApprovedDriver(),
            ],
            'notifications' => fn () => $user ? [
                'unread' => $user->unreadNotifications()->count(),
                'latest' => $user->notifications()->limit(5)->get()->map(fn ($n) => [
                    'id' => $n->id,
                    'title' => $n->data['title'] ?? 'Notification',
                    'body' => $n->data['body'] ?? '',
                    'read' => $n->read_at !== null,
                    'created_at' => $n->created_at->toIso8601String(),
                ]),
            ] : null,
            'support_email' => fn () => Setting::get('support_email'),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
