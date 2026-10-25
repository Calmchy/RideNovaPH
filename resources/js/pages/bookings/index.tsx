// The ONE "Bookings" page: Find a ride | My bookings | Requests (drivers).
// Every filter below is a real GET request handled by BookingController@index.
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Receipt } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    ReasonDialog,
    SimplePager,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import type { Paginated, SimplePaginated } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import RideCard from '@/components/ride-card';
import type { RideCardData } from '@/components/ride-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Row = {
    id: number;
    reference_no: string;
    status: string;
    seats: number;
    total_fare: string;
    route: string;
    departure_at: string;
    payment_status: string | null;
    passenger?: string;
};

type Props = {
    tab: 'find' | 'mine' | 'requests';
    filters: Record<string, string>;
    is_driver: boolean;
    pending_requests: number;
    rides?: SimplePaginated<RideCardData>;
    cities?: { id: number; name: string }[];
    bookings?: Paginated<Row>;
};

const STATUSES = [
    'pending',
    'approved',
    'confirmed',
    'completed',
    'cancelled',
].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

/** PATCH a booking transition; the server decides if it is allowed and answers with a toast. */
const act = (id: number, action: string, reason?: string) =>
    router.patch(`/bookings/${id}/${action}`, reason ? { reason } : {}, {
        preserveScroll: true,
    });

function RowActions({ b, tab }: { b: Row; tab: Props['tab'] }) {
    const cancel = (
        <ReasonDialog
            title={`Cancel ${b.reference_no}?`}
            description="The other side will be notified. This cannot be undone."
            confirmLabel="Cancel booking"
            destructive
            onConfirm={(r) => act(b.id, 'cancel', r)}
            trigger={
                <Button size="sm" variant="outline">
                    Cancel
                </Button>
            }
        />
    );

    return (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
            {tab === 'requests' && b.status === 'pending' && (
                <Button size="sm" onClick={() => act(b.id, 'approve')}>
                    Approve
                </Button>
            )}
            {tab === 'mine' && b.status === 'approved' && (
                <Button size="sm" onClick={() => act(b.id, 'confirm')}>
                    Confirm
                </Button>
            )}
            {tab === 'requests' && b.status === 'confirmed' && (
                <Button size="sm" onClick={() => act(b.id, 'complete')}>
                    Complete
                </Button>
            )}
            {['pending', 'approved', 'confirmed'].includes(b.status) && cancel}
            {b.payment_status === 'paid' && (
                <Button size="sm" variant="ghost" asChild aria-label="Receipt">
                    <Link href={`/bookings/${b.id}/receipt`}>
                        <Receipt />
                    </Link>
                </Button>
            )}
            <Button size="sm" variant="ghost" asChild aria-label="View booking">
                <Link href={`/bookings/${b.id}`}>
                    <Eye />
                </Link>
            </Button>
        </div>
    );
}

export default function BookingsIndex({
    tab,
    filters,
    is_driver,
    pending_requests,
    rides,
    cities,
    bookings,
}: Props) {
    const tabs = [
        { id: 'find', label: 'Find a ride' },
        { id: 'mine', label: 'My bookings' },
        ...(is_driver
            ? [{ id: 'requests', label: 'Requests', badge: pending_requests }]
            : []),
    ];
    const cityOptions = (cities ?? []).map((c) => ({
        value: c.id,
        label: c.name,
    }));

    return (
        <>
            <Head title="Bookings" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <PageHeader
                    title="Bookings"
                    description="Find a seat, manage your reservations and keep your reference numbers in one place."
                    // Drivers get a shortcut so they don't have to switch to the Driver area first.
                    // The server still checks the driver role + approval on /driver/rides/create.
                    actions={
                        is_driver ? (
                            <Button asChild>
                                <Link href="/driver/rides/create">
                                    <Plus /> Publish a ride
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                <nav
                    className="flex gap-1 border-b"
                    aria-label="Bookings sections"
                >
                    {tabs.map((t) => (
                        <Link
                            key={t.id}
                            href={`/bookings?tab=${t.id}`}
                            aria-current={tab === t.id ? 'page' : undefined}
                            className={cn(
                                '-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium',
                                tab === t.id
                                    ? 'border-ocean text-ocean dark:border-foam dark:text-foam'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t.label}
                            {'badge' in t && t.badge ? (
                                <span className="rounded-full bg-coral px-1.5 text-[11px] font-bold text-deep">
                                    {t.badge}
                                </span>
                            ) : null}
                        </Link>
                    ))}
                </nav>

                {tab === 'find' && rides && (
                    <>
                        <FilterBar
                            url="/bookings"
                            extra={{ tab: 'find' }}
                            values={filters}
                            fields={[
                                {
                                    name: 'origin',
                                    type: 'select',
                                    placeholder: 'Anywhere',
                                    label: 'From',
                                    options: cityOptions,
                                },
                                {
                                    name: 'destination',
                                    type: 'select',
                                    placeholder: 'Anywhere',
                                    label: 'To',
                                    options: cityOptions,
                                },
                                { name: 'date', type: 'date', label: 'Date' },
                                {
                                    name: 'max_price',
                                    type: 'select',
                                    placeholder: 'Any price',
                                    label: 'Max price / seat',
                                    options: [200, 300, 500, 1000].map((v) => ({
                                        value: v,
                                        label: `Up to ₱${v}`,
                                    })),
                                },
                                {
                                    name: 'sort',
                                    type: 'select',
                                    placeholder: 'Soonest first',
                                    label: 'Sort',
                                    options: [
                                        {
                                            value: 'cheapest',
                                            label: 'Cheapest first',
                                        },
                                    ],
                                },
                            ]}
                        />
                        {rides.data.length ? (
                            <>
                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {rides.data.map((r) => (
                                        <RideCard key={r.id} ride={r} />
                                    ))}
                                </div>
                                <SimplePager page={rides} />
                            </>
                        ) : (
                            <EmptyState>
                                No rides match these filters. Try another date
                                or destination.
                            </EmptyState>
                        )}
                    </>
                )}

                {tab !== 'find' && bookings && (
                    <>
                        <FilterBar
                            url="/bookings"
                            extra={{ tab }}
                            values={filters}
                            fields={[
                                {
                                    name: 'q',
                                    type: 'search',
                                    placeholder:
                                        'Reference number, e.g. RNP-2026…',
                                },
                                {
                                    name: 'status',
                                    type: 'select',
                                    placeholder: 'All statuses',
                                    label: 'Status',
                                    options: STATUSES,
                                },
                            ]}
                        />
                        {bookings.data.length ? (
                            <div className="overflow-x-auto rounded-2xl border bg-card">
                                <table className={tableCls}>
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className={thCls}>Reference</th>
                                            <th className={thCls}>Route</th>
                                            {tab === 'requests' && (
                                                <th className={thCls}>
                                                    Passenger
                                                </th>
                                            )}
                                            <th className={thCls}>Departure</th>
                                            <th className={thCls}>Seats</th>
                                            <th className={thCls}>Total</th>
                                            <th className={thCls}>Status</th>
                                            <th className={thCls}>Payment</th>
                                            <th className={thCls}>
                                                <span className="sr-only">
                                                    Actions
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {bookings.data.map((b) => (
                                            <tr
                                                key={b.id}
                                                className="hover:bg-muted/30"
                                            >
                                                <td
                                                    className={cn(
                                                        tdCls,
                                                        'font-mono text-xs',
                                                    )}
                                                >
                                                    <Link
                                                        href={`/bookings/${b.id}`}
                                                        className="text-ocean hover:underline dark:text-foam"
                                                    >
                                                        {b.reference_no}
                                                    </Link>
                                                </td>
                                                <td className={tdCls}>
                                                    {b.route}
                                                </td>
                                                {tab === 'requests' && (
                                                    <td className={tdCls}>
                                                        {b.passenger}
                                                    </td>
                                                )}
                                                <td
                                                    className={cn(
                                                        tdCls,
                                                        'whitespace-nowrap',
                                                    )}
                                                >
                                                    {fmtDateTime(
                                                        b.departure_at,
                                                    )}
                                                </td>
                                                <td className={tdCls}>
                                                    {b.seats}
                                                </td>
                                                <td className={tdCls}>
                                                    {peso(b.total_fare)}
                                                </td>
                                                <td className={tdCls}>
                                                    <StatusBadge
                                                        status={b.status}
                                                    />
                                                </td>
                                                <td className={tdCls}>
                                                    {b.payment_status ? (
                                                        <StatusBadge
                                                            status={
                                                                b.payment_status
                                                            }
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className={tdCls}>
                                                    <RowActions
                                                        b={b}
                                                        tab={tab}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState>
                                {tab === 'mine' ? (
                                    <>
                                        No bookings yet.{' '}
                                        <Link
                                            href="/bookings?tab=find"
                                            className="text-ocean underline dark:text-foam"
                                        >
                                            Find a ride
                                        </Link>
                                    </>
                                ) : (
                                    'No passenger requests yet.'
                                )}
                            </EmptyState>
                        )}
                        <Pager page={bookings} />
                    </>
                )}
            </div>
        </>
    );
}
