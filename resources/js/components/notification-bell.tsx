// Bell in the header: unread badge + the 5 latest notifications. Clicking one opens
// /notifications/{id}, which marks it read on the server and redirects to the page it refers to.
import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { fmtDateTime } from '@/components/lux';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Notice = {
    id: string;
    title: string;
    body: string;
    read: boolean;
    created_at: string;
};

export default function NotificationBell() {
    const { notifications } = usePage().props as unknown as {
        notifications: { unread: number; latest: Notice[] } | null;
    };

    if (!notifications) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={`Notifications (${notifications.unread} unread)`}
                >
                    <Bell className="size-5" />
                    {notifications.unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-deep">
                            {notifications.unread > 9
                                ? '9+'
                                : notifications.unread}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    Notifications
                    {notifications.unread > 0 && (
                        <button
                            className="text-xs font-normal text-ocean hover:underline dark:text-foam"
                            onClick={() =>
                                router.post(
                                    '/notifications/read-all',
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            Mark all read
                        </button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.latest.length === 0 && (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                        You’re all caught up.
                    </p>
                )}
                {notifications.latest.map((n) => (
                    <DropdownMenuItem key={n.id} asChild>
                        <Link
                            href={`/notifications/${n.id}`}
                            className="flex cursor-pointer flex-col items-start gap-0.5"
                        >
                            <span
                                className={cn(
                                    'text-sm',
                                    !n.read && 'font-semibold',
                                )}
                            >
                                {!n.read && (
                                    <span className="mr-1.5 inline-block size-2 rounded-full bg-coral" />
                                )}
                                {n.title}
                            </span>
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                                {n.body}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {fmtDateTime(n.created_at)}
                            </span>
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        href="/notifications"
                        className="cursor-pointer justify-center text-sm"
                    >
                        View all
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
