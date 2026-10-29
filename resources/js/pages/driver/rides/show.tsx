// One ride: trip status controls (start / complete / cancel) and the passenger list.
import { Head, Link, router } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import {
    EmptyState,
    PageHeader,
    Panel,
    ReasonDialog,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    ride: {
        id: number;
        route: string;
        pickup_point: string;
        dropoff_point: string | null;
        departure_at: string;
        vehicle: string;
        seats_offered: number;
        seats_taken: number;
        price_per_seat: string;
        trip_status: string;
        notes: string | null;
        event: string | null;
        started_at: string | null;
        cancellation_reason: string | null;
    };
    passengers: {
        id: number;
        reference_no: string;
        name: string;
        status: string;
        seats: number;
        phone: string | null;
        pickup_location: string | null;
        payment_status: string | null;
        earnings: string | null;
    }[];
};

export default function DriverRideShow({ ride, passengers }: Props) {
    const patch = (action: string, data: Record<string, string> = {}) =>
        router.patch(`/driver/rides/${ride.id}/${action}`, data, {
            preserveScroll: true,
        });
    const scheduled = ride.trip_status === 'scheduled';
    const onRoad = ride.trip_status === 'on_the_road';

    return (
        <>
            <Head title={ride.route} />
            <Link
                href="/driver/rides"
                className="text-sm text-muted-foreground hover:text-foreground"
            >
                ← My rides
            </Link>
            <PageHeader
                title={ride.route}
                description={`${fmtDateTime(ride.departure_at)} · ${ride.vehicle} · ${peso(ride.price_per_seat)} per seat`}
                actions={<StatusBadge status={ride.trip_status} />}
            />

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
                <p className="mr-auto text-sm text-muted-foreground">
                    {ride.seats_taken}/{ride.seats_offered} seats booked ·
                    pick-up {ride.pickup_point}
                </p>
                {scheduled && (
                    <Button onClick={() => patch('start')}>Start trip</Button>
                )}
                {onRoad && (
                    <ReasonDialog
                        title="Complete this trip?"
                        description="Confirmed passengers are marked completed and get receipts. Unconfirmed requests are closed."
                        askReason={false}
                        confirmLabel="Complete trip"
                        onConfirm={() => patch('complete')}
                        trigger={<Button>Complete trip</Button>}
                    />
                )}
                {(scheduled || onRoad) && (
                    <ReasonDialog
                        title="Cancel this ride?"
                        description="Every open booking is cancelled and passengers are notified."
                        confirmLabel="Cancel ride"
                        destructive
                        onConfirm={(reason) => patch('cancel', { reason })}
                        trigger={
                            <Button variant="destructive">Cancel ride</Button>
                        }
                    />
                )}
                {ride.trip_status === 'cancelled' &&
                    ride.cancellation_reason && (
                        <p className="text-sm text-destructive">
                            Cancelled: {ride.cancellation_reason}
                        </p>
                    )}
            </div>

            {(ride.notes || ride.event) && (
                <Panel title="Trip description">
                    <div className="grid gap-2 p-5 text-sm">
                        {ride.event && (
                            <p>
                                <span className="text-muted-foreground">
                                    Event:{' '}
                                </span>
                                <strong>{ride.event}</strong>
                            </p>
                        )}
                        {ride.notes && (
                            <p className="whitespace-pre-line">{ride.notes}</p>
                        )}
                    </div>
                </Panel>
            )}

            <Panel title="Passenger list">
                {passengers.length ? (
                    <div className="overflow-x-auto">
                        <table className={tableCls}>
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    {[
                                        'Passenger',
                                        'Reference',
                                        'Seats',
                                        'Status',
                                        'Contact',
                                        'Pick-up',
                                        'Payment',
                                        'You earn',
                                    ].map((h) => (
                                        <th key={h} className={thCls}>
                                            {h}
                                        </th>
                                    ))}
                                    <th className={thCls} />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {passengers.map((p) => (
                                    <tr key={p.id}>
                                        <td className={tdCls}>{p.name}</td>
                                        <td
                                            className={`${tdCls} font-mono text-xs`}
                                        >
                                            <Link
                                                href={`/bookings/${p.id}`}
                                                className="text-ocean hover:underline dark:text-foam"
                                            >
                                                {p.reference_no}
                                            </Link>
                                        </td>
                                        <td className={tdCls}>{p.seats}</td>
                                        <td className={tdCls}>
                                            <StatusBadge status={p.status} />
                                        </td>
                                        <td className={tdCls}>
                                            {p.phone ? (
                                                <a
                                                    href={`tel:${p.phone}`}
                                                    className="inline-flex items-center gap-1 text-ocean hover:underline dark:text-foam"
                                                >
                                                    <Phone className="size-3" />
                                                    {p.phone}
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className={tdCls}>
                                            {p.pickup_location ?? '—'}
                                        </td>
                                        <td className={tdCls}>
                                            {p.payment_status ? (
                                                <StatusBadge
                                                    status={p.payment_status}
                                                />
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className={tdCls}>
                                            {p.earnings
                                                ? peso(p.earnings)
                                                : '—'}
                                        </td>
                                        <td className={tdCls}>
                                            {p.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        router.patch(
                                                            `/bookings/${p.id}/approve`,
                                                            {},
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-5">
                        <EmptyState>No passengers yet.</EmptyState>
                    </div>
                )}
            </Panel>
        </>
    );
}
