// One charter request: terms, the driver's price, actions for the right person, contact number and chat.
// Buttons come from `abilities` (computed by the server); the server re-checks every click.
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import CharterChat from '@/components/charter-chat';
import type { ChatMessage } from '@/components/charter-chat';
import { Field, inputCls, PageHeader, Panel, ReasonDialog } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    charter: {
        id: number;
        reference_no: string;
        status: string;
        group_size: number;
        pickup_location: string;
        dropoff_location: string;
        pickup_at: string;
        return_location: string | null;
        return_at: string | null;
        description: string | null;
        vehicle: string;
        quoted_price: string | null;
        driver_note: string | null;
        reason: string | null;
    };
    role: 'passenger' | 'driver';
    partner: { name: string; phone: string | null; label: string };
    abilities: {
        quote: boolean;
        decline: boolean;
        accept: boolean;
        cancel: boolean;
        complete: boolean;
    };
    chat_open: boolean;
    messages: ChatMessage[];
};

const STATUS_HELP: Record<string, Record<'passenger' | 'driver', string>> = {
    pending: {
        passenger: 'Waiting for the driver to review your terms and send a price.',
        driver: 'Review the terms below, then send your price or decline.',
    },
    quoted: {
        passenger: 'The driver accepted your terms and sent a price. Accept it to confirm the trip, or chat to negotiate.',
        driver: 'Waiting for the passenger to accept your price. You can update it while you wait.',
    },
    accepted: {
        passenger: 'Confirmed. Pay the driver the agreed price in cash on the trip.',
        driver: 'Confirmed. Collect the agreed price in cash, then mark the trip completed after it happens.',
    },
    completed: {
        passenger: 'This trip is completed.',
        driver: 'This trip is completed.',
    },
    declined: {
        passenger: 'The driver declined this request.',
        driver: 'You declined this request.',
    },
    cancelled: {
        passenger: 'This request was cancelled.',
        driver: 'This request was cancelled.',
    },
};

export default function CharterShow({
    charter: c,
    role,
    partner,
    abilities,
    chat_open,
    messages,
}: Props) {
    const quote = useForm({
        price: c.quoted_price ?? '',
        note: c.driver_note ?? '',
    });
    const act = (action: string, data: Record<string, string> = {}) =>
        router.patch(`/charters/${c.id}/${action}`, data, {
            preserveScroll: true,
        });

    const rows: [string, string][] = [
        ['Group size', `${c.group_size} passenger${c.group_size === 1 ? '' : 's'}`],
        ['Vehicle', c.vehicle],
        ['Pick-up point', c.pickup_location],
        ['Drop-off point', c.dropoff_location],
        ['Pick-up date & time', fmtDateTime(c.pickup_at)],
        ...(c.return_location && c.return_at
            ? ([
                  ['Return from', c.return_location],
                  ['Return date & time', fmtDateTime(c.return_at)],
              ] as [string, string][])
            : []),
    ];

    return (
        <>
            <Head title={`Request ${c.reference_no}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
                <Link
                    href="/charters"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← Hire a driver
                </Link>
                <PageHeader
                    title={`Group booking ${c.reference_no}`}
                    description={STATUS_HELP[c.status]?.[role]}
                    actions={<StatusBadge status={c.status} />}
                />

                {(c.status === 'declined' || c.status === 'cancelled') &&
                    c.reason && (
                        <p className="rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm">
                            Reason: {c.reason}
                        </p>
                    )}

                {/* Actions for this person */}
                <div className="flex flex-wrap items-center gap-3">
                    {abilities.accept && (
                        <ReasonDialog
                            title={`Accept ${peso(c.quoted_price ?? 0)}?`}
                            description="This confirms the trip. You pay the driver this amount in cash."
                            askReason={false}
                            confirmLabel="Accept price"
                            onConfirm={() => act('accept')}
                            trigger={<Button>Accept price</Button>}
                        />
                    )}
                    {abilities.complete && (
                        <ReasonDialog
                            title="Mark this trip completed?"
                            description="Only after the trip happened and you received the agreed cash."
                            askReason={false}
                            confirmLabel="Mark completed"
                            onConfirm={() => act('complete')}
                            trigger={<Button>Mark trip completed</Button>}
                        />
                    )}
                    {abilities.decline && (
                        <ReasonDialog
                            title="Decline this request?"
                            description="The passenger will see your reason."
                            reasonRequired
                            reasonLabel="Reason"
                            confirmLabel="Decline"
                            destructive
                            onConfirm={(reason) => act('decline', { reason })}
                            trigger={<Button variant="outline">Decline</Button>}
                        />
                    )}
                    {abilities.cancel && (
                        <ReasonDialog
                            title="Cancel this request?"
                            description="The other person will be notified and will see your reason."
                            reasonRequired
                            reasonLabel="Why are you cancelling?"
                            confirmLabel="Cancel request"
                            destructive
                            onConfirm={(reason) => act('cancel', { reason })}
                            trigger={
                                <Button variant="destructive">Cancel</Button>
                            }
                        />
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Panel title="Trip terms">
                        <dl className="grid gap-3 p-5 text-sm">
                            {rows.map(([k, v]) => (
                                <div
                                    key={k}
                                    className="flex justify-between gap-4"
                                >
                                    <dt className="text-muted-foreground">
                                        {k}
                                    </dt>
                                    <dd className="text-right">{v}</dd>
                                </div>
                            ))}
                            {c.description && (
                                <div className="border-t pt-3">
                                    <dt className="text-muted-foreground">
                                        Description
                                    </dt>
                                    <dd className="mt-1 whitespace-pre-line">
                                        {c.description}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </Panel>

                    <div className="grid content-start gap-6">
                        <Panel title="Price">
                            <div className="grid gap-3 p-5 text-sm">
                                {c.quoted_price ? (
                                    <p className="text-3xl font-semibold">
                                        {peso(c.quoted_price)}
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            cash, whole vehicle
                                        </span>
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground">
                                        {role === 'driver'
                                            ? 'You decide the price for this trip.'
                                            : 'The driver will set the price after reviewing your terms.'}
                                    </p>
                                )}
                                {c.driver_note && (
                                    <p className="rounded-xl bg-muted/50 p-3">
                                        Driver’s note: {c.driver_note}
                                    </p>
                                )}

                                {abilities.quote && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            quote.patch(
                                                `/charters/${c.id}/quote`,
                                                { preserveScroll: true },
                                            );
                                        }}
                                        className="grid gap-3 border-t pt-4"
                                    >
                                        <Field
                                            label="Your price (₱) *"
                                            error={quote.errors.price}
                                        >
                                            <input
                                                required
                                                type="number"
                                                min={1}
                                                max={500000}
                                                step="0.01"
                                                value={quote.data.price}
                                                onChange={(e) =>
                                                    quote.setData(
                                                        'price',
                                                        e.target.value,
                                                    )
                                                }
                                                className={inputCls}
                                            />
                                        </Field>
                                        <Field
                                            label="Note to the passenger (optional)"
                                            error={quote.errors.note}
                                        >
                                            <textarea
                                                rows={2}
                                                maxLength={500}
                                                value={quote.data.note}
                                                onChange={(e) =>
                                                    quote.setData(
                                                        'note',
                                                        e.target.value,
                                                    )
                                                }
                                                className={inputCls}
                                            />
                                        </Field>
                                        <Button
                                            type="submit"
                                            disabled={quote.processing}
                                        >
                                            {c.quoted_price
                                                ? 'Update price'
                                                : 'Accept terms & send price'}
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </Panel>

                        <Panel title={partner.label}>
                            <div className="grid gap-1 p-5 text-sm">
                                <p className="font-semibold">{partner.name}</p>
                                {partner.phone ? (
                                    <a
                                        href={`tel:${partner.phone}`}
                                        className="inline-flex items-center gap-1.5 text-ocean hover:underline"
                                    >
                                        <Phone className="size-4" />
                                        {partner.phone}
                                    </a>
                                ) : (
                                    <p className="text-muted-foreground">
                                        No contact number on file. Use the chat.
                                    </p>
                                )}
                            </div>
                        </Panel>
                    </div>
                </div>

                <Panel title={`Chat with ${partner.name}`}>
                    <CharterChat
                        charterId={c.id}
                        initial={messages}
                        open={chat_open}
                    />
                </Panel>
            </div>
        </>
    );
}
