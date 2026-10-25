<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** In-app notifications (the bell in the header). Everything is scoped to the signed-in user. */
class NotificationController extends Controller
{
    /** GET /notifications */
    public function index(Request $request): Response
    {
        $items = $request->user()->notifications()->paginate(15)->through(fn ($n) => [
            'id' => $n->id,
            'title' => $n->data['title'] ?? 'Notification',
            'body' => $n->data['body'] ?? '',
            'url' => $n->data['url'] ?? null,
            'read' => $n->read_at !== null,
            'created_at' => $n->created_at->toIso8601String(),
        ]);

        return Inertia::render('notifications/index', ['notifications' => $items]);
    }

    /** GET /notifications/{id} : mark as read, then go to the page the notice points at. */
    public function open(Request $request, string $id): RedirectResponse
    {
        $notice = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notice->markAsRead();

        $url = $notice->data['url'] ?? null;

        // Only ever redirect to a path on THIS site (blocks open-redirects like //evil.com).
        return is_string($url) && preg_match('#^/(?!/)#', $url) ? redirect($url) : back();
    }

    /** POST /notifications/read-all */
    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    }
}
