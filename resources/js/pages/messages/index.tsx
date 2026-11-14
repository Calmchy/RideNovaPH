// My conversations (passengers <-> drivers). Open one to read and reply.
import { Head, Link } from '@inertiajs/react';
import { EmptyState, PageHeader } from '@/components/kit';
import { fmtDateTime } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

type Conversation = {
    user_id: number;
    name: string;
    online: boolean;
    preview: string;
    mine: boolean;
    at: string;
    unread: number;
};

export default function MessagesIndex({
    conversations,
}: {
    conversations: Conversation[];
}) {
    const initials = useInitials();

    return (
        <>
            <Head title="Messages" />
            <div className="space-y-6 p-4 md:p-8">
                <PageHeader
                    title="Messages"
                    description="Chats with drivers and passengers. To start one, open a driver’s profile."
                />
                {conversations.length ? (
                    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                        {conversations.map((c) => (
                            <li key={c.user_id}>
                                <Link
                                    href={`/messages/${c.user_id}`}
                                    className="flex items-center gap-3 p-4 hover:bg-muted/40"
                                >
                                    <span className="relative">
                                        <Avatar className="size-11">
                                            <AvatarFallback className="bg-ocean font-semibold text-white">
                                                {initials(c.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {c.online && (
                                            <span
                                                role="img"
                                                aria-label="Online"
                                                className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-card bg-green-500"
                                            />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-baseline justify-between gap-3">
                                            <span className="truncate font-medium">
                                                {c.name}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {fmtDateTime(c.at)}
                                            </span>
                                        </span>
                                        <span
                                            className={
                                                c.unread
                                                    ? 'block truncate text-sm font-semibold'
                                                    : 'block truncate text-sm text-muted-foreground'
                                            }
                                        >
                                            {c.mine ? 'You: ' : ''}
                                            {c.preview}
                                        </span>
                                    </span>
                                    {c.unread > 0 && (
                                        <span
                                            className="grid min-w-6 place-items-center rounded-full bg-coral px-1.5 py-0.5 text-xs font-semibold text-white"
                                            aria-label={`${c.unread} unread`}
                                        >
                                            {c.unread}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState>
                        No messages yet.{' '}
                        <Link
                            href="/drivers"
                            className="text-ocean underline dark:text-foam"
                        >
                            Find a driver
                        </Link>
                    </EmptyState>
                )}
            </div>
        </>
    );
}
