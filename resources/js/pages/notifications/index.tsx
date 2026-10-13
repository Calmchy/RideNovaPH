import { Head, Link, router } from '@inertiajs/react';
import { BellRing } from 'lucide-react';
import { EmptyState, PageHeader, Pager } from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDateTime } from '@/components/lux';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Notice = {
    id: string;
    title: string;
    body: string;
    url: string | null;
    read: boolean;
    created_at: string;
};

export default function Notifications({
    notifications,
}: {
    notifications: Paginated<Notice>;
}) {
    return (
        <>
            <Head title="Notifications" />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
                <PageHeader
                    title="Notifications"
                    description="Booking updates, approvals, receipts and refunds."
                    actions={
                        <Button
                            variant="outline"
                            onClick={() =>
                                router.post(
                                    '/notifications/read-all',
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            Mark all as read
                        </Button>
                    }
                />
                {notifications.data.length ? (
                    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                        {notifications.data.map((n) => (
                            <li key={n.id}>
                                <Link
                                    href={`/notifications/${n.id}`}
                                    className={cn(
                                        'flex gap-3 p-4 transition hover:bg-muted/50',
                                        !n.read && 'bg-foam/20 dark:bg-foam/5',
                                    )}
                                >
                                    <BellRing
                                        className={cn(
                                            'mt-0.5 size-5 shrink-0',
                                            n.read
                                                ? 'text-muted-foreground'
                                                : 'text-coral',
                                        )}
                                    />
                                    <div className="min-w-0">
                                        <p
                                            className={cn(
                                                'text-sm',
                                                !n.read && 'font-semibold',
                                            )}
                                        >
                                            {n.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {n.body}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {fmtDateTime(n.created_at)}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState>No notifications yet.</EmptyState>
                )}
                <Pager page={notifications} />
            </div>
        </>
    );
}
