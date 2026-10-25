// One booking: reference number, status timeline, trip + contact details, map, payment, actions, reviews.
// Buttons shown here come from `abilities` (computed by the server policy); the server re-checks on click.
import { Head, Link, router } from '@inertiajs/react';
import { Check, Copy, Receipt } from 'lucide-react';
import { useState } from 'react';
import { Panel, ReasonDialog } from '@/components/kit';
import LiveTracking from '@/components/live-tracking';
import { fmtDateTime, peso, Stars, StatusBadge } from '@/components/lux';
import TripMap from '@/components/trip-map';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Details = {
    name: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    pickup_location: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    pickup_at: string | null;
    return_location: string | null;
    return_lat: number | null;
    return_lng: number | null;
    return_at: string | null;
};

type Props = {
    booking: {
        id: number;
        reference_no: string;
        status: string;
        seats: number;
        total_fare: string;
        route: string;
        passenger: string;
        driver: string;
        vehicle: string;
        plate_number: string;
        pickup_point: string;
        departure_at: string;
        trip_status: string;
        approved_at: string | null;
        confirmed_at: string | null;
        completed_at: string | null;
        cancelled_at: string | null;
        cancellation_reason: string | null;
        details: Details;
        payment: {
            status: string;
            method: string;
            amount: string;
            platform_fee: string;
            driver_earnings: string;
            receipt_no: string | null;
            paid_at: string | null;
            refund_reason: string | null;
            cancellation_fee: string;
            fee_status: string;
        } | null;
        cancel_fee: number;
        cancel_fee_percent: number;
        reviews: { by: string; rating: number; comment: string | null }[];
    };
    tracking: { ride_id: number; role: 'driver' | 'passenger' } | null;
    viewer_role: 'passenger' | 'driver' | 'admin' | null;
    abilities: {
        approve: boolean;
        confirm: boolean;
        complete: boolean;
        cancel: boolean;
        review: boolean;
    };
};

const LABEL = {
    approve: 'Approve request',
    confirm: 'Confirm my seat',
    complete: 'Mark trip completed',
} as const;

export default function BookingShow({
    booking: b,
    viewer_role,
    abilities,
    tracking,
}: Props) {
    const [copied, setCopied] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const act = (action: string, data: Record<string, string> = {}) =>
        router.patch(`/bookings/${b.id}/${action}`, data, {
            preserveScroll: true,
        });

    const copy = async () => {
        await navigator.clipboard.writeText(b.reference_no);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const timeline: [string, string | null][] = [
        ['Reserved', null],
        ['Approved by driver', b.approved_at],
        ['Confirmed by passenger', b.confirmed_at],
        ['Trip completed', b.completed_at],
    ];
    const d = b.details;
    const pickup =
        d.pickup_lat != null && d.pickup_lng != null
            ? { lat: d.pickup_lat, lng: d.pickup_lng }
            : null;
    const ret =
        d.return_lat != null && d.return_lng != null
            ? { lat: d.return_lat, lng: d.return_lng }
            : null;
    const pay = b.payment;
    const showReceipt = pay && ['paid', 'refunded'].includes(pay.status);

    return (
        <>
            <Head title={`Booking ${b.reference_no}`} />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
                <Link
                    href="/bookings?tab=mine"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← All bookings
                </Link>

                <header className="rounded-2xl bg-deep p-6 text-white shadow-sm">
                    <p className="text-xs tracking-[0.3em] text-sand uppercase">
                        Booking reference
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="font-mono text-2xl tracking-wider md:text-3xl">
                            {b.reference_no}
                        </p>
                        <button
                            onClick={copy}
                            aria-label="Copy reference number"
                            className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                        >
                            {copied ? (
                                <Check className="size-4 text-foam" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                        </button>
                        <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-3 text-sm text-foam/80">
                        Show this code to your driver. It is your proof of
                        booking.
                    </p>
                </header>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    {(['approve', 'confirm', 'complete'] as const).map(
                        (a) =>
                            abilities[a] && (
                                <Button key={a} onClick={() => act(a)}>
                                    {LABEL[a]}
                                </Button>
                            ),
                    )}
                    {abilities.cancel && (
                        <ReasonDialog
                            title="Cancel this booking?"
                            description={
                                viewer_role === 'passenger' && b.cancel_fee > 0
                                    ? `Heads up: the driver already approved, so a ${b.cancel_fee_percent}% cancellation fee of ${peso(b.cancel_fee)} applies. You can't book again until it is settled.`
                                    : 'The other side will be notified and will see your reason. Cancelling after a driver approves may cost a fee.'
                            }
                            reasonRequired
                            reasonLabel="Why are you cancelling?"
                            confirmLabel="Cancel booking"
                            destructive
                            onConfirm={(reason) => act('cancel', { reason })}
                            trigger={
                                <Button variant="destructive">
                                    Cancel booking
                                </Button>
                            }
                        />
                    )}
                    {showReceipt && (
                        <Button variant="outline" asChild>
                            <Link href={`/bookings/${b.id}/receipt`}>
                                <Receipt /> View receipt
                            </Link>
                        </Button>
                    )}
                </div>

                {b.status === 'cancelled' ? (
                    <p className="rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm">
                        Cancelled
                        {b.cancelled_at && ` on ${fmtDateTime(b.cancelled_at)}`}
                        .
                        {b.cancellation_reason &&
                            ` Reason: ${b.cancellation_reason}`}
                    </p>
                ) : (
                    <ol
                        className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-4"
                        aria-label="Status timeline"
                    >
                        {timeline.map(([label, at], i) => (
                            <li key={label} className="flex items-start gap-3">
                                <span
                                    className={cn(
                                        'mt-1 size-3 shrink-0 rounded-full',
                                        i === 0 || at ? 'bg-ocean' : 'bg-muted',
                                    )}
                                />
                                <span className="text-sm">
                                    <span
                                        className={
                                            i === 0 || at
                                                ? ''
                                                : 'text-muted-foreground'
                                        }
                                    >
                                        {label}
                                    </span>
                                    {i > 0 && at && (
                                        <span className="block text-xs text-muted-foreground">
                                            {fmtDateTime(at)}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <Panel title="Trip">
                        <dl className="grid gap-3 p-5 text-sm">
                            {[
                                ['Route', b.route],
                                ['Departure', fmtDateTime(b.departure_at)],
                                ['Meeting point', b.pickup_point],
                                ['Seats', String(b.seats)],
                                ['Driver', b.driver],
                                ['Vehicle', `${b.vehicle} · ${b.plate_number}`],
                                [
                                    'Trip status',
                                    b.trip_status.replace(/_/g, ' '),
                                ],
                            ].map(([k, v]) => (
                                <div
                                    key={k}
                                    className="flex justify-between gap-4"
                                >
                                    <dt className="text-muted-foreground">
                                        {k}
                                    </dt>
                                    <dd className="text-right first-letter:uppercase">
                                        {v}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Panel>

                    <Panel title="Payment">
                        <div className="space-y-3 p-5 text-sm">
                            {pay ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Status
                                        </span>
                                        <StatusBadge status={pay.status} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Method
                                        </span>
                                        <span>Cash on ride</span>
                                    </div>
                                    <div className="flex items-center justify-between text-base font-semibold">
                                        <span>Total</span>
                                        <span>{peso(pay.amount)}</span>
                                    </div>
                                    {viewer_role !== 'passenger' && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Platform fee
                                                </span>
                                                <span>
                                                    {peso(pay.platform_fee)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Driver earnings
                                                </span>
                                                <span>
                                                    {peso(pay.driver_earnings)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                    {pay.receipt_no && (
                                        <p className="font-mono text-xs text-muted-foreground">
                                            Receipt {pay.receipt_no}
                                        </p>
                                    )}
                                    {Number(pay.cancellation_fee) > 0 && (
                                        <p className="rounded-lg bg-coral/10 p-2 text-xs">
                                            Cancellation fee{' '}
                                            {peso(pay.cancellation_fee)} ·{' '}
                                            {pay.fee_status === 'due'
                                                ? 'unpaid. Settle it with support before booking again.'
                                                : pay.fee_status}
                                        </p>
                                    )}
                                    {pay.refund_reason && (
                                        <p className="rounded-lg bg-coral/10 p-2 text-xs">
                                            Refunded: {pay.refund_reason}
                                        </p>
                                    )}
                                    {pay.status === 'pending' && (
                                        <p className="text-xs text-muted-foreground">
                                            Pay the driver in cash. The receipt
                                            is issued when the trip is
                                            completed.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted-foreground">
                                    Total {peso(b.total_fare)} (cash on ride)
                                </p>
                            )}
                        </div>
                    </Panel>
                </div>

                <Panel title="Contact &amp; pick-up details">
                    <div className="grid gap-6 p-5 md:grid-cols-2">
                        <dl className="grid gap-3 text-sm">
                            {[
                                ['Passenger', d.name ?? b.passenger],
                                ['Phone', d.phone],
                                ['Email', d.email],
                                ['Address', d.address],
                                ['Pick-up', d.pickup_location],
                                [
                                    'Pick-up time',
                                    d.pickup_at && fmtDateTime(d.pickup_at),
                                ],
                                ['Return', d.return_location],
                                [
                                    'Return time',
                                    d.return_at && fmtDateTime(d.return_at),
                                ],
                            ]
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                    <div key={k as string}>
                                        <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                                            {k}
                                        </dt>
                                        <dd>{v}</dd>
                                    </div>
                                ))}
                        </dl>
                        {(pickup || ret) && (
                            <TripMap
                                pickup={pickup}
                                dropoff={ret}
                                live={b.trip_status === 'on_the_road'}
                                className="h-64 w-full rounded-xl border"
                            />
                        )}
                    </div>
                </Panel>

                {/* Real-time GPS: only sent by the server while the trip is confirmed and the tracking window is open. */}
                {tracking && (
                    <LiveTracking
                        bookingId={b.id}
                        rideId={tracking.ride_id}
                        role={tracking.role}
                    />
                )}

                {b.reviews.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="font-serif text-2xl">Reviews</h2>
                        {b.reviews.map((r) => (
                            <div
                                key={r.by}
                                className="rounded-xl border bg-card p-4"
                            >
                                <p className="text-sm text-muted-foreground">
                                    From the {r.by}
                                </p>
                                <Stars value={r.rating} />
                                {r.comment && (
                                    <p className="mt-1 text-sm">{r.comment}</p>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {abilities.review && (
                    <Panel title="How was the trip?">
                        <div className="space-y-3 p-5">
                            <div
                                className="flex gap-1"
                                role="radiogroup"
                                aria-label="Rating"
                            >
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        role="radio"
                                        aria-checked={rating === n}
                                        aria-label={`${n} stars`}
                                        onClick={() => setRating(n)}
                                        className={cn(
                                            'text-3xl transition',
                                            n <= rating
                                                ? 'text-sand'
                                                : 'text-muted-foreground/30',
                                        )}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                maxLength={1000}
                                rows={3}
                                placeholder="Optional comment"
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            />
                            <Button
                                onClick={() =>
                                    router.post(
                                        `/bookings/${b.id}/reviews`,
                                        { rating, comment },
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Submit review
                            </Button>
                        </div>
                    </Panel>
                )}
            </div>
        </>
    );
}
