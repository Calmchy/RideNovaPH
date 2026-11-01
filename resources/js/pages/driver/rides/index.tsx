import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    Panel,
    ReasonDialog,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Ride = {
    id: number;
    route: string;
    departure_at: string;
    vehicle: string;
    seats_offered: number;
    seats_taken: number;
    pending_requests: number;
    price_per_seat: string;
    trip_status: string;
};

type Req = {
    id: number;
    reference_no: string;
    status: string;
    seats: number;
    total_fare: string;
    route: string;
    departure_at: string;
    payment_status: string | null;
    passenger: string;
};

/** PATCH a booking transition; the server decides if it is allowed and answers with a toast. */
const act = (id: number, action: string, reason?: string) =>
    router.patch(`/bookings/${id}/${action}`, reason ? { reason } : {}, {
        preserveScroll: true,
    });

/** Passenger seat requests for my rides, answered right here so the driver never leaves this page. */
function RequestsPanel({ requests, pending }: { requests: Req[]; pending: number }) {
    return (
        <Panel
            title={
                pending
                    ? `Passenger requests · ${pending} waiting for you`
                    : 'Passenger requests'
            }
        >
            {requests.length ? (
                <>
                    <div className="overflow-x-auto">
                        <table className={tableCls}>
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    {[
                                        'Passenger',
                                        'Route',
                                        'Departure',
                                        'Seats',
                                        'Total',
                                        'Status',
                                    ].map((h) => (
                                        <th key={h} className={thCls}>
                                            {h}
                                        </th>
                                    ))}
                                    <th className={thCls} />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {requests.map((b) => (
                                    <tr key={b.id} className="hover:bg-muted/30">
                                        <td className={tdCls}>
                                            <Link
                                                href={`/bookings/${b.id}`}
                                                className="font-medium text-ocean hover:underline dark:text-foam"
                                            >
                                                {b.passenger}
                                            </Link>
                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                {b.reference_no}
                                            </p>
                                        </td>
                                        <td className={tdCls}>{b.route}</td>
                                        <td className={`${tdCls} whitespace-nowrap`}>
                                            {fmtDateTime(b.departure_at)}
                                        </td>
                                        <td className={tdCls}>{b.seats}</td>
                                        <td className={tdCls}>{peso(b.total_fare)}</td>
                                        <td className={tdCls}>
                                            <StatusBadge status={b.status} />
                                        </td>
                                        <td className={tdCls}>
                                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                {b.status === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => act(b.id, 'approve')}
                                                    >
                                                        Approve
                                                    </Button>
                                                )}
                                                {b.status === 'confirmed' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => act(b.id, 'complete')}
                                                    >
                                                        Complete
                                                    </Button>
                                                )}
                                                <ReasonDialog
                                                    title={`${b.status === 'pending' ? 'Decline' : 'Cancel'} ${b.reference_no}?`}
                                                    description="The passenger will be notified. This cannot be undone."
                                                    confirmLabel={b.status === 'pending' ? 'Decline request' : 'Cancel booking'}
                                                    destructive
                                                    onConfirm={(r) => act(b.id, 'cancel', r)}
                                                    trigger={
                                                        <Button size="sm" variant="outline">
                                                            {b.status === 'pending' ? 'Decline' : 'Cancel'}
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState>
                    No passenger requests waiting. New ones show up here as soon
                    as someone reserves a seat on your rides.
                </EmptyState>
            )}
        </Panel>
    );
}

export default function DriverRides({
    rides,
    filters,
    requests,
    pending_total,
}: {
    rides: Paginated<Ride>;
    filters: Record<string, string>;
    requests: Req[];
    pending_total: number;
}) {
    return (
        <>
            <Head title="My rides" />
            <PageHeader
                title="My rides"
                description="Everything you have published. Open a ride to see passengers and control the trip."
                actions={
                    <Button asChild>
                        <Link href="/driver/rides/create">
                            <Plus /> Publish a ride
                        </Link>
                    </Button>
                }
            />
            <RequestsPanel requests={requests} pending={pending_total} />
            <FilterBar
                url="/driver/rides"
                values={filters}
                fields={[
                    {
                        name: 'q',
                        type: 'search',
                        placeholder: 'Search by city',
                    },
                    {
                        name: 'status',
                        type: 'select',
                        placeholder: 'All statuses',
                        label: 'Status',
                        options: ['open', 'completed', 'cancelled'].map(
                            (s) => ({
                                value: s,
                                label: s[0].toUpperCase() + s.slice(1),
                            }),
                        ),
                    },
                ]}
            />
            {rides.data.length ? (
                <div className="overflow-x-auto rounded-2xl border bg-card">
                    <table className={tableCls}>
                        <thead className="border-b bg-muted/50">
                            <tr>
                                {[
                                    'Route',
                                    'Departure',
                                    'Vehicle',
                                    'Seats',
                                    'Price',
                                    'Trip',
                                ].map((h) => (
                                    <th key={h} className={thCls}>
                                        {h}
                                    </th>
                                ))}
                                <th className={thCls} />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rides.data.map((r) => (
                                <tr key={r.id} className="hover:bg-muted/30">
                                    <td className={tdCls}>{r.route}</td>
                                    <td
                                        className={`${tdCls} whitespace-nowrap`}
                                    >
                                        {fmtDateTime(r.departure_at)}
                                    </td>
                                    <td className={tdCls}>{r.vehicle}</td>
                                    <td className={tdCls}>
                                        {r.seats_taken}/{r.seats_offered}
                                        {r.pending_requests > 0 && (
                                            <span className="ml-2 rounded-full bg-coral px-1.5 text-[11px] font-bold text-deep">
                                                {r.pending_requests} new
                                            </span>
                                        )}
                                    </td>
                                    <td className={tdCls}>
                                        {peso(r.price_per_seat)}
                                    </td>
                                    <td className={tdCls}>
                                        <StatusBadge status={r.trip_status} />
                                    </td>
                                    <td className={tdCls}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={`/driver/rides/${r.id}`}
                                            >
                                                Manage
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState>No rides found.</EmptyState>
            )}
            <Pager page={rides} />
        </>
    );
}
