// "Nova": the floating chat assistant. It talks to POST /chatbot (rule-based, no external AI).
// Security notes: the CSRF token is sent from Laravel's XSRF-TOKEN cookie, messages are capped at
// 300 characters (server enforces it too) and replies are rendered as plain text (never as HTML).
import { MessageCircle, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Msg = { from: 'me' | 'nova'; text: string };

const QUICK = [
    'How do I book?',
    'Payment',
    'Verify my ID',
    'Become a driver',
    'My bookings',
];

/** Read Laravel's XSRF cookie (the same token axios/Inertia use). */
const xsrf = () =>
    decodeURIComponent(
        document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1] ?? '',
    );

export default function ChatbotWidget() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [text, setText] = useState('');
    const [msgs, setMsgs] = useState<Msg[]>([
        {
            from: 'nova',
            text: 'Hi, I’m Nova! Ask me about booking, payment, ID verification or becoming a driver.',
        },
    ]);
    const end = useRef<HTMLDivElement>(null);

    // Other buttons on the site can open the chat with: window.dispatchEvent(new Event('nova:open'))
    useEffect(() => {
        const openIt = () => setOpen(true);
        window.addEventListener('nova:open', openIt);

        return () => window.removeEventListener('nova:open', openIt);
    }, []);

    useEffect(() => {
        end.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs, open]);

    async function send(message: string) {
        const m = message.trim().slice(0, 300);

        if (!m || busy) {
            return;
        }

        setMsgs((x) => [...x, { from: 'me', text: m }]);
        setText('');
        setBusy(true);

        try {
            const res = await fetch('/chatbot', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrf(),
                },
                body: JSON.stringify({ message: m }),
            });

            const reply = res.ok
                ? ((await res.json()) as { reply: string }).reply
                : res.status === 429
                  ? 'You’re sending messages too fast. Please wait a moment.'
                  : 'Sorry, something went wrong. Please try again.';
            setMsgs((x) => [...x, { from: 'nova', text: reply }]);
        } catch {
            setMsgs((x) => [
                ...x,
                { from: 'nova', text: 'I can’t reach the server right now.' },
            ]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed right-4 bottom-4 z-50 print:hidden">
            {open && (
                <div className="mb-3 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
                    <div className="flex items-center justify-between bg-deep px-4 py-3 text-white">
                        <div>
                            <p className="font-semibold">Nova</p>
                            <p className="text-xs text-foam">
                                RideNovaPH assistant
                            </p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                            className="rounded-full p-1 hover:bg-white/10"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <div
                        className="flex-1 space-y-2 overflow-y-auto p-3"
                        aria-live="polite"
                    >
                        {msgs.map((m, i) => (
                            <p
                                key={i}
                                className={cn(
                                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                                    m.from === 'me'
                                        ? 'ml-auto bg-ocean text-white'
                                        : 'bg-muted text-foreground',
                                )}
                            >
                                {m.text}
                            </p>
                        ))}
                        {busy && (
                            <p className="w-fit rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                                …
                            </p>
                        )}
                        <div ref={end} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 border-t px-3 pt-2">
                        {QUICK.map((q) => (
                            <button
                                key={q}
                                onClick={() => send(q)}
                                className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary"
                            >
                                {q}
                            </button>
                        ))}
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            send(text);
                        }}
                        className="flex gap-2 p-3"
                    >
                        <input
                            value={text}
                            maxLength={300}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type your question…"
                            aria-label="Message Nova"
                            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-ring"
                        />
                        <button
                            disabled={busy}
                            aria-label="Send"
                            className="grid size-9 place-items-center rounded-full bg-coral text-deep disabled:opacity-50"
                        >
                            <Send className="size-4" />
                        </button>
                    </form>
                </div>
            )}

            <button
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? 'Close Nova chat' : 'Open Nova chat'}
                className="ml-auto grid size-14 place-items-center rounded-full bg-coral text-deep shadow-lg transition hover:scale-105"
            >
                {open ? (
                    <X className="size-6" />
                ) : (
                    <MessageCircle className="size-6" />
                )}
            </button>
        </div>
    );
}
