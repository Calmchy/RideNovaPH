// One rental request: dates, price, the renter's details (shown only to the two people involved) and actions.
import { Head, Link, router } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import { useState } from 'react';
import { inputCls, PageHeader, Panel, ReasonDialog } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    rental: {
        id: number;
        reference_no: string;
        status: string;
        vehicle: string;
        start_at: string;
        end_at: string;
        pickup_location: string;
        return_location: string;
        purpose: string | null;
        days: number;
        daily_rate: string;
        total_price: string;
        owner_note: string | null;
        reason: string | null;
        renter: {
            name: string;
            phone: string;
            address: string;
            license_number: string;
            license_expiry: string;
        };
    };
    role: 'renter' | 'owner';
    partner: { label: string; name: string; phone: string | null };
    abilities: {
        approve: boolean;
        decline: boolean;
        cancel: boolean;
        complete: boolean;
    };
};

const HELP: Record<string, Record<'renter' | 'owner', string>> = {
    pending: {
        renter: 'Waiting for the owner to review your details.',
        owner: 'Check the renter’s details, then approve or decline.',
    },
    approved: {
        renter: 'Approved! Meet the owner at the pick-up place and pay in cash.',
        owner: 'Approved. The vehicle is reserved for these dates.',
    },
    completed: {
        renter: 'The vehicle was returned. Thank you!',
        owner: 'The vehicle was returned.',
    },
    declined: {
        renter: 'The owner declined this request.',
        owner: 'You declined this request.',
    },
    cancelled: {
        renter: 'This request was cancelled.',
        owner: 'This request was cancelled.',
    },
};

export default function RentalShow({
    rental: r,
    role,
    partner,
    abilities,
}: Props) {
    const [note, setNote] = useState('');
    const act = (action: string, data: Record<string, string> = {}) =>
        router.patch(`/rentals/${r.id}/${action}`, data, {
            preserveScroll: true,
        });

    const when: [string, string][] = [
        ['Vehicle', r.vehicle],
        ['Starts', fmtDateTime(r.start_at)],
        ['Returns', fmtDateTime(r.end_at)],
        ['Pick-up place', r.pickup_location],
        ['Return place', r.return_location],
    ];
    const renter: [string, string][] = [
        ['Name', r.renter.name],
        ['Contact number', r.renter.phone],
        ['Home address', r.renter.address],
        ['Licence number', r.renter.license_number],
        ['Licence expires', r.renter.license_expiry],
    ];

    return (
        <>
            <Head title={`Rental ${r.reference_no}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
                <Link
                    href="/charters"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← Hire a driver
                </Link>
                <PageHeader
                    title={`Rental ${r.reference_no}`}
                    description={HELP[r.status]?.[role]}
                    actions={<StatusBadge status={r.status} />}
                />

                {(r.status === 'declined' || r.status === 'cancelled') &&
                    r.reason && (
                        <p className="rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm">
                            Reason: {r.reason}
                        </p>
                    )}
                {r.owner_note && (
                    <p className="rounded-xl border bg-card p-4 text-sm">
                        <span className="text-muted-foreground">
                            Note from the owner:{' '}
                        </span>
                        {r.owner_note}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    {abilities.approve && (
                        <ReasonDialog
                            title="Approve this rental?"
                            description={`Your vehicle is reserved for these dates and the renter pays you ${peso(r.total_price)} in cash at pick-up.`}
                            askReason={false}
                            confirmLabel="Approve"
                            onConfirm={() => act('approve', { note })}
                            trigger={<Button>Approve</Button>}
                        />
                    )}
                    {abilities.complete && (
                        <ReasonDialog
                            title="Vehicle returned?"
                            description="Only after you have the vehicle back and received the cash."
                            askReason={false}
                            confirmLabel="Mark returned"
                            onConfirm={() => act('complete')}
                            trigger={<Button>Mark vehicle returned</Button>}
                        />
                    )}
                    {abilities.decline && (
                        <ReasonDialog
                            title="Decline this request?"
                            description="The renter will see your reason."
                            reasonRequired
                            confirmLabel="Decline"
                            destructive
                            onConfirm={(reason) => act('decline', { reason })}
                            trigger={<Button variant="outline">Decline</Button>}
                        />
                    )}
                    {abilities.cancel && (
                        <ReasonDialog
                            title="Cancel this rental?"
                            description="The other person will be notified and will see your reason."
                            reasonRequired
                            reasonLabel="Why are you cancelling?"
                            confirmLabel="Cancel rental"
                            destructive
                            onConfirm={(reason) => act('cancel', { reason })}
                            trigger={
                                <Button variant="destructive">Cancel</Button>
                            }
                        />
                    )}
                </div>

                {abilities.approve && (
                    <label className="grid max-w-xl gap-1 text-sm">
                        Optional note to the renter (shown when you approve)
                        <input
                            value={note}
                            maxLength={500}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Bring your original licence. Fuel is full."
                            className={inputCls}
                        />
                    </label>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <Panel title="When and where">
                        <dl className="grid gap-3 p-5 text-sm">
                            {when.map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">{k}</dt>
                                    <dd className="text-right">{v}</dd>
                                </div>
                            ))}
                            {r.purpose && (
                                <div className="border-t pt-3">
                                    <dt className="text-muted-foreground">
                                        Purpose
                                    </dt>
                                    <dd className="mt-1 whitespace-pre-line">
                                        {r.purpose}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </Panel>

                    <div className="grid content-start gap-6">
                        <Panel title="Price">
                            <div className="space-y-1 p-5 text-sm">
                                <p className="text-muted-foreground">
                                    {r.days} day{r.days === 1 ? '' : 's'} ×{' '}
                                    {peso(r.daily_rate)}
                                </p>
                                <p className="font-serif text-3xl">
                                    {peso(r.total_price)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Cash, paid to the owner at pick-up.
                                </p>
                            </div>
                        </Panel>

                        <Panel title={partner.label}>
                            <div className="space-y-1 p-5 text-sm">
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
                                        The owner’s number is shown once the
                                        rental is approved.
                                    </p>
                                )}
                            </div>
                        </Panel>
                    </div>
                </div>

                <Panel title={role === 'owner' ? 'Renter details' : 'Your details'}>
                    <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                        {renter.map(([k, v]) => (
                            <div key={k}>
                                <dt className="text-muted-foreground">{k}</dt>
                                <dd className="font-medium">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </Panel>
            </div>
        </>
    );
}
