// One rental request: dates, price, the renter's details (shown only to the two people involved) and actions.
import { Head, Link, router } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import { useState } from 'react';
import { inputCls, PageHeader, Panel, ReasonDialog } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { RentalTermsList } from '@/components/rental-terms';
import type { TermRow } from '@/components/rental-terms';
import DocTile from '@/components/doc-tile';
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
            license_id_url: string | null;
            birth_date: string | null;
            age: number | null;
            license_type: string | null;
            driving_years: number | null;
            passenger_count: number | null;
            emergency_name: string | null;
            emergency_phone: string | null;
            emergency_relationship: string | null;
            emergency_address: string | null;
            destination: string | null;
            additional_drivers: string | null;
            signature_name: string | null;
        };
    };
    extension: {
        notice_hours: number;
        deadline: string;
        max_days: number;
        daily_rate: string;
        can_request: boolean;
        can_decide: boolean;
        list: {
            id: number;
            days: number;
            extra_price: string;
            new_end_at: string;
            status: string;
            reason: string | null;
            created_at: string;
        }[];
    };
    terms: TermRow[];
    terms_accepted_at: string | null;
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
    extension: ext,
    terms,
    terms_accepted_at,
    role,
    partner,
    abilities,
}: Props) {
    const [note, setNote] = useState('');
    const [extDays, setExtDays] = useState('');
    const [extError, setExtError] = useState<string | null>(null);
    const [extSending, setExtSending] = useState(false);
    const extN = Math.floor(Number(extDays));
    const requestExtension = () =>
        router.post(
            `/rentals/${r.id}/extensions`,
            { days: extDays },
            {
                preserveScroll: true,
                onStart: () => {
                    setExtSending(true);
                    setExtError(null);
                },
                onError: (e) => setExtError(e.days ?? 'Could not send the request.'),
                onSuccess: () => setExtDays(''),
                onFinish: () => setExtSending(false),
            },
        );
    const answerExtension = (id: number, action: string, data = {}) =>
        router.patch(`/rentals/${r.id}/extensions/${id}/${action}`, data, {
            preserveScroll: true,
        });
    const pendingExt = ext.list.find((e) => e.status === 'pending');
    const showExtension =
        ext.list.length > 0 || (r.status === 'approved' && role === 'renter');
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
        ['Licence type', r.renter.license_type ?? '—'],
        [
            'Date of birth',
            r.renter.birth_date
                ? `${r.renter.birth_date} (${r.renter.age} years old)`
                : '—',
        ],
        [
            'Driving experience',
            r.renter.driving_years !== null
                ? `${r.renter.driving_years} year(s)`
                : '—',
        ],
        ['People riding', String(r.renter.passenger_count ?? '—')],
        [
            'Emergency contact',
            r.renter.emergency_name
                ? `${r.renter.emergency_name}${r.renter.emergency_relationship ? ` (${r.renter.emergency_relationship})` : ''} · ${r.renter.emergency_phone}`
                : '—',
        ],
        ['Emergency contact address', r.renter.emergency_address ?? '—'],
        ['Will drive it to', r.renter.destination ?? '—'],
        ['Other drivers', r.renter.additional_drivers || 'None'],
        ['Signed by', r.renter.signature_name ?? '—'],
    ];

    return (
        <>
            <Head title={`Rental ${r.reference_no}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
                <Link
                    href={role === 'owner' ? '/driver/rentals' : '/charters'}
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    {role === 'owner' ? '← Rent my unit' : '← Hire a driver'}
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

                {showExtension && (
                    <Panel title="Extend the rental">
                        <div className="space-y-4 p-5 text-sm">
                            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                                <strong>Notice:</strong> an extension must be
                                requested at least {ext.notice_hours} hours
                                before the return time ({fmtDateTime(ext.deadline)}
                                ). The owner will be notified and will accept
                                or decline your request.
                            </p>

                            {role === 'renter' && r.status === 'approved' && (
                                <>
                                    {ext.can_request ? (
                                        <div className="flex flex-wrap items-end gap-3">
                                            <label className="grid gap-1">
                                                <span className="text-muted-foreground">
                                                    How many days do you want
                                                    to add? (up to {ext.max_days})
                                                </span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={ext.max_days}
                                                    step={1}
                                                    value={extDays}
                                                    onChange={(e) => setExtDays(e.target.value)}
                                                    className={`${inputCls} w-32`}
                                                />
                                            </label>
                                            <Button
                                                onClick={requestExtension}
                                                disabled={
                                                    extSending ||
                                                    !(extN >= 1 && extN <= ext.max_days)
                                                }
                                            >
                                                {extSending ? 'Sending…' : 'Request extension'}
                                            </Button>
                                            {extN >= 1 && extN <= ext.max_days && (
                                                <span className="text-muted-foreground">
                                                    + {extN} day{extN === 1 ? '' : 's'} ×{' '}
                                                    {peso(ext.daily_rate)} ={' '}
                                                    {peso(extN * Number(ext.daily_rate))}
                                                </span>
                                            )}
                                        </div>
                                    ) : pendingExt ? (
                                        <p className="text-muted-foreground">
                                            Your extension is waiting for the owner.
                                        </p>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            The {ext.notice_hours}-hour notice time has passed, so
                                            you can’t request an extension here anymore. Please
                                            contact the owner or return the vehicle on time.
                                        </p>
                                    )}
                                    {extError && (
                                        <p role="alert" className="text-coral">
                                            {extError}
                                        </p>
                                    )}
                                </>
                            )}

                            {ext.list.length > 0 && (
                                <ul className="divide-y rounded-xl border">
                                    {ext.list.map((e) => (
                                        <li
                                            key={e.id}
                                            className="flex flex-wrap items-center justify-between gap-3 p-3"
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    +{e.days} day{e.days === 1 ? '' : 's'} ·{' '}
                                                    {peso(e.extra_price)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    New return time: {fmtDateTime(e.new_end_at)}
                                                </p>
                                                {e.reason && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Reason: {e.reason}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={e.status} />
                                                {e.status === 'pending' &&
                                                    ext.can_decide && (
                                                        <>
                                                            <ReasonDialog
                                                                title="Accept this extension?"
                                                                description={`The return time moves to ${fmtDateTime(e.new_end_at)} and ${peso(e.extra_price)} is added to the total.`}
                                                                askReason={false}
                                                                confirmLabel="Accept"
                                                                onConfirm={() => answerExtension(e.id, 'approve')}
                                                                trigger={<Button size="sm">Accept</Button>}
                                                            />
                                                            <ReasonDialog
                                                                title="Decline this extension?"
                                                                description="The renter will see your reason."
                                                                reasonRequired
                                                                confirmLabel="Decline"
                                                                destructive
                                                                onConfirm={(reason) =>
                                                                    answerExtension(e.id, 'decline', { reason })
                                                                }
                                                                trigger={
                                                                    <Button size="sm" variant="outline">
                                                                        Decline
                                                                    </Button>
                                                                }
                                                            />
                                                        </>
                                                    )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </Panel>
                )}

                {terms.length > 0 && (
                    <Panel title="Terms and conditions">
                        <RentalTermsList rows={terms} />
                        {terms_accepted_at && (
                            <p className="border-t px-5 py-3 text-xs text-muted-foreground">
                                {role === 'owner'
                                    ? 'The renter agreed to these terms on '
                                    : 'You agreed to these terms on '}
                                {fmtDateTime(terms_accepted_at)}.
                            </p>
                        )}
                    </Panel>
                )}

                <Panel title={role === 'owner' ? 'Renter details' : 'Your details'}>
                    <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                        {renter.map(([k, v]) => (
                            <div key={k}>
                                <dt className="text-muted-foreground">{k}</dt>
                                <dd className="font-medium">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="max-w-sm border-t p-5">
                        <DocTile
                            label="Driver’s licence ID"
                            url={r.renter.license_id_url}
                            emptyText="No licence ID photo"
                        />
                    </div>
                </Panel>
            </div>
        </>
    );
}
