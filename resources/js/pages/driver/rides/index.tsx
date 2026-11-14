import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
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
    date_passed?: boolean;
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

/** "Today", "Tomorrow" or "Sun, Nov 8, 2026": the heading above each day's rows. */
const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const day = (x: Date) =>
        new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(d) - day(new Date())) / 86400000);
    const text = d.toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return diff === 0
        ? `Today · ${text}`
        : diff === 1
          ? `Tomorrow · ${text}`
          : diff === -1
            ? `Yesterday · ${text}`
            : text;
};

/** Keeps the server's order and starts a new group whenever the travel day changes. */
function groupByDay<T extends { departure_at: string }>(
    items: T[],
): { key: string; label: string; items: T[] }[] {
    const groups: { key: string; label: string; items: T[] }[] = [];

    for (const it of items) {
        const key = new Date(it.departure_at).toDateString();
        const last = groups[groups.length - 1];

        if (last && last.key === key) {
            last.items.push(it);
        } else {
            groups.push({ key, label: dayLabel(it.departure_at), items: [it] });
        }
    }

    return groups;
}

/** One separate card per day: a heading, then that day's table. */
function DayCard({
    label,
    count,
    head,
    children,
}: {
    label: string;
    count: number;
    head: string[];
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b bg-ocean/10 px-4 py-2 text-xs font-semibold tracking-wide text-ocean uppercase dark:text-foam">
                {label}
                <span className="ml-2 font-normal text-muted-foreground normal-case">
                    {count} {count === 1 ? 'item' : 'items'}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className={tableCls}>
                    <thead className="border-b bg-muted/50">
                        <tr>
                            {head.map((h) => (
                                <th key={h} className={thCls}>
                                    {h}
                                </th>
                            ))}
                            <th className={thCls} />
                        </tr>
                    </thead>
                    <tbody>{children}</tbody>
                </table>
            </div>
        </section>
    );
}

/** PATCH a booking transition; the server decides if it is allowed and answers with a toast. */
const act = (id: number, action: string, reason?: string) =>
    router.patch(`/bookings/${id}/${action}`, reason ? { reason } : {}, {
        preserveScroll: true,
    });

/** Passenger seat requests for my rides, answered right here so the driver never leaves this page. */
function RequestsPanel({
    requests,
    pending,
    hasDate,
}: {
    requests: Req[];
    pending: number;
    hasDate: boolean;
}) {
    return (
        <Panel
            title={
                pending
                    ? `Passenger requests · ${pending} waiting for you`
                    : 'Passenger requests'
            }
        >
            {requests.length ? (
                <div className="space-y-4 p-4">
                    {groupByDay(requests).map((g) => (
                        <DayCard
                            key={g.key}
                            label={g.label}
                            count={g.items.length}
                            head={[
                                'Passenger',
                                'Route',
                                'Departure',
                                'Seats',
                                'Total',
                                'Status',
                            ]}
                        >
                            {g.items.map((b) => (
                                <tr
                                    key={b.id}
                                    className="border-b hover:bg-muted/30"
                                >
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
                                    <td
                                        className={`${tdCls} whitespace-nowrap`}
                                    >
                                        {fmtDateTime(b.departure_at)}
                                    </td>
                                    <td className={tdCls}>{b.seats}</td>
                                    <td className={tdCls}>
                                        {peso(b.total_fare)}
                                    </td>
                                    <td className={tdCls}>
                                        <StatusBadge status={b.status} />
                                    </td>
                                    <td className={tdCls}>
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            {b.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        act(b.id, 'approve')
                                                    }
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                            {b.status === 'confirmed' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        act(b.id, 'complete')
                                                    }
                                                >
                                                    Complete
                                                </Button>
                                            )}
                                            <ReasonDialog
                                                title={`${b.status === 'pending' ? 'Decline' : 'Cancel'} ${b.reference_no}?`}
                                                description="The passenger will be notified. This cannot be undone."
                                                confirmLabel={
                                                    b.status === 'pending'
                                                        ? 'Decline request'
                                                        : 'Cancel booking'
                                                }
                                                destructive
                                                onConfirm={(r) =>
                                                    act(b.id, 'cancel', r)
                                                }
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        {b.status === 'pending'
                                                            ? 'Decline'
                                                            : 'Cancel'}
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </DayCard>
                    ))}
                </div>
            ) : (
                <EmptyState>
                    {hasDate
                        ? 'No passenger requests for that date.'
                        : 'No passenger requests waiting. New ones show up here as soon as someone reserves a seat on your rides.'}
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
            <FilterBar
                url="/driver/rides"
                values={filters}
                fields={[
                    {
                        name: 'date',
                        type: 'date',
                        label: 'Date (rides & requests)',
                    },
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
            <RequestsPanel
                requests={requests}
                pending={pending_total}
                hasDate={Boolean(filters.date)}
            />
            {rides.data.length ? (
                <div className="space-y-4">
                    {groupByDay(rides.data).map((g) => (
                        <DayCard
                            key={g.key}
                            label={g.label}
                            count={g.items.length}
                            head={[
                                'Route',
                                'Departure',
                                'Vehicle',
                                'Seats',
                                'Price',
                                'Trip',
                            ]}
                        >
                            {g.items.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-b hover:bg-muted/30"
                                >
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
                                        {r.date_passed ? (
                                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                                                Date passed · no longer
                                                available
                                            </span>
                                        ) : (
                                            <StatusBadge
                                                status={r.trip_status}
                                            />
                                        )}
                                    </td>
                                    <td
                                        className={`${tdCls} space-x-2 whitespace-nowrap`}
                                    >
                                        {r.date_passed && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            'Delete this ride schedule? Its date has already passed.',
                                                        )
                                                    ) {
                                                        router.delete(
                                                            `/driver/rides/${r.id}`,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        );
                                                    }
                                                }}
                                            >
                                                Delete Ride Schedule
                                            </Button>
                                        )}
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
                        </DayCard>
                    ))}
                </div>
            ) : (
                <EmptyState>No rides found.</EmptyState>
            )}
            <Pager page={rides} />
        </>
    );
}
