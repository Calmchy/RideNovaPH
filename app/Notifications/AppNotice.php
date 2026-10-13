<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * One generic in-app notification (title + body + where to go when clicked).
 * Stored in the `notifications` table and shown by the bell in the header.
 */
class AppNotice extends Notification
{
    public function __construct(
        private readonly string $title,
        private readonly string $body,
        private readonly ?string $url = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string|null> */
    public function toArray(object $notifiable): array
    {
        return ['title' => $this->title, 'body' => $this->body, 'url' => $this->url];
    }
}
