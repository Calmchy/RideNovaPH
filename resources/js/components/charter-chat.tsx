// Simple two-person chat (a charter request, or a direct message thread). Polls every few seconds,
// only while the tab is visible.
// Messages are plain text rendered by React (escaped), so nothing a user types can run as HTML.
import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatMessage = {
    id: number;
    mine: boolean;
    name: string;
    body: string;
    at: string;
    /** Only on my own messages in a direct chat: sent -> delivered (they were online) -> seen. */
    status?: 'sent' | 'delivered' | 'seen' | null;
};

export type Presence = { online: boolean; last_seen: string | null };

const STATUS_LABEL = { sent: 'Sent', delivered: 'Delivered', seen: 'Seen' } as const;

const ago = (iso: string) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

    if (s < 60) {
        return 'just now';
    }

    const m = Math.floor(s / 60);

    if (m < 60) {
        return `${m} min ago`;
    }

    const h = Math.floor(m / 60);

    if (h < 24) {
        return `${h} hr ago`;
    }

    const d = Math.floor(h / 24);

    return `${d} day${d === 1 ? '' : 's'} ago`;
};

/** Laravel's CSRF token travels in the XSRF-TOKEN cookie; echo it back in a header for fetch(). */
function xsrf(): string {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return m ? decodeURIComponent(m[1]) : '';
}

const time = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    });

export default function CharterChat({
    charterId,
    url,
    interval = 5000,
    initial,
    open,
    emptyText = 'No messages yet. Say hello and discuss the details.',
    partner,
}: {
    /** A charter request's chat. Or pass `url` for any other thread (GET ?after=ID to poll, POST to send). */
    charterId?: number;
    url?: string;
    /** Milliseconds between checks for new messages. */
    interval?: number;
    initial: ChatMessage[];
    open: boolean;
    emptyText?: string;
    /** Direct chat only: is the other person online? Kept up to date by the poll. */
    partner?: Presence;
}) {
    const base = url ?? `/charters/${charterId}/messages`;
    const [messages, setMessages] = useState(initial);
    const [presence, setPresence] = useState<Presence | undefined>(partner);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const end = useRef<HTMLDivElement>(null);
    const lastId = useRef(initial.at(-1)?.id ?? 0);

    /** Add messages we haven't seen yet (ids only grow, so this also de-duplicates). */
    const merge = (incoming: ChatMessage[]) => {
        const fresh = incoming.filter((m) => m.id > lastId.current);

        if (!fresh.length) {
            return;
        }

        lastId.current = fresh[fresh.length - 1].id;
        setMessages((prev) => [...prev, ...fresh]);
    };

    // Poll for the other person's messages.
    useEffect(() => {
        const tick = async () => {
            if (document.hidden) {
                return;
            }

            try {
                const res = await fetch(
                    `${base}?after=${lastId.current}`,
                    {
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    },
                );

                if (res.ok) {
                    const json = await res.json();
                    merge(json.messages);

                    // Direct chat: update the Sent / Delivered / Seen labels and the online dot.
                    if (json.statuses) {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.mine && json.statuses[m.id]
                                    ? { ...m, status: json.statuses[m.id] }
                                    : m,
                            ),
                        );
                    }

                    if (json.partner) {
                        setPresence(json.partner);
                    }
                }
            } catch {
                /* offline: try again next tick */
            }
        };
        const t = setInterval(tick, interval);

        return () => clearInterval(t);
    }, [base, interval]);

    useEffect(() => {
        end.current?.scrollIntoView({ block: 'nearest' });
    }, [messages.length]);

    const send = async () => {
        const body = text.trim();

        if (!body || sending) {
            return;
        }

        setSending(true);
        setError(null);

        try {
            const res = await fetch(base, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrf(),
                },
                body: JSON.stringify({ body }),
            });

            if (res.ok) {
                merge([(await res.json()).message]);
                setText('');
            } else {
                setError(
                    res.status === 429
                        ? 'You are sending too fast. Wait a moment.'
                        : 'Message not sent. Try again.',
                );
            }
        } catch {
            setError('No connection. Try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col">
            {presence && (
                <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-2 rounded-full',
                            presence.online ? 'bg-green-500' : 'bg-muted-foreground/40',
                        )}
                    />
                    {presence.online
                        ? 'Online'
                        : presence.last_seen
                          ? `Last active ${ago(presence.last_seen)}`
                          : 'Offline'}
                </div>
            )}
            <div
                className="flex max-h-96 min-h-48 flex-col gap-2 overflow-y-auto p-4"
                aria-live="polite"
            >
                {messages.length === 0 && (
                    <p className="m-auto text-sm text-muted-foreground">
                        {emptyText}
                    </p>
                )}
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={cn(
                            'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                            m.mine
                                ? 'ml-auto bg-ocean text-white'
                                : 'bg-muted text-foreground',
                        )}
                    >
                        {!m.mine && (
                            <p className="text-xs font-semibold opacity-70">
                                {m.name}
                            </p>
                        )}
                        <p className="break-words whitespace-pre-line">
                            {m.body}
                        </p>
                        <p className="mt-0.5 text-right text-[10px] opacity-70">
                            {time(m.at)}
                            {m.mine && m.status && (
                                <span
                                    className={cn(
                                        'ml-1',
                                        m.status === 'seen' && 'font-semibold',
                                    )}
                                >
                                    · {STATUS_LABEL[m.status]}
                                </span>
                            )}
                        </p>
                    </div>
                ))}
                <div ref={end} />
            </div>

            {open ? (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send();
                    }}
                    className="flex items-end gap-2 border-t p-3"
                >
                    <textarea
                        value={text}
                        rows={1}
                        maxLength={500}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void send();
                            }
                        }}
                        placeholder="Type a message…"
                        aria-label="Message"
                        className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={sending || !text.trim()}
                        aria-label="Send message"
                    >
                        <Send />
                    </Button>
                </form>
            ) : (
                <p className="border-t p-3 text-center text-xs text-muted-foreground">
                    This conversation is closed.
                </p>
            )}
            {error && (
                <p role="alert" className="px-4 pb-3 text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
