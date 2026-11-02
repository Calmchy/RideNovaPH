// One conversation. New messages appear by themselves every few seconds.
import { Head, Link } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import CharterChat from '@/components/charter-chat';
import type { ChatMessage, Presence } from '@/components/charter-chat';
import { Panel } from '@/components/kit';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';

type Props = {
    partner: {
        id: number;
        name: string;
        phone: string | null;
        is_driver: boolean;
    } & Presence;
    messages: ChatMessage[];
    can_send: boolean;
};

export default function MessageThread({ partner, messages, can_send }: Props) {
    const initials = useInitials();

    return (
        <>
            <Head title={`Chat with ${partner.name}`} />
            <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
                <Link
                    href="/messages"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← All messages
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="size-12">
                            <AvatarFallback className="bg-ocean font-semibold text-white">
                                {initials(partner.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="font-serif text-2xl leading-tight">
                                {partner.name}
                            </h1>
                            {partner.phone && (
                                <a
                                    href={`tel:${partner.phone.replace(/\s+/g, '')}`}
                                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <Phone className="size-3.5" />
                                    {partner.phone}
                                </a>
                            )}
                        </div>
                    </div>
                    {partner.is_driver && (
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/drivers/${partner.id}`}>View driver profile</Link>
                        </Button>
                    )}
                </div>

                <Panel title="Chat">
                    <CharterChat
                        url={`/messages/${partner.id}/chat`}
                        interval={3000}
                        initial={messages}
                        partner={{ online: partner.online, last_seen: partner.last_seen }}
                        open={can_send}
                        emptyText="No messages yet. Say hello!"
                    />
                </Panel>
            </div>
        </>
    );
}
