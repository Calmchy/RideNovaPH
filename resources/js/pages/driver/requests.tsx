// Driver > Passenger requests: seat requests for MY rides. Approve, complete or cancel from here.
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Receipt } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    ReasonDialog,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Row = {
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

type Props = {
    filters: Record<string, string>;
    pending: number;
    bookings: Paginated<Row>;
};

const STATUSES = ['pending', 'approved', 'confirmed', 'completed', 'cancelled'].map(
    (s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }),
);

/** PATCH a booking transition; the server decides if it is allowed and answers with a toast. */
const act = (id: number, action: string, reason?: string) =>
    router.patch(`/bookings/${id}/${action}`, reason ? { reason } : {}, {
        preserveScroll: true,
    });

export default function DriverRequests({ filters, pending, bookings }: Props) {
    return (
        <>
            <Head title="Passenger requests" />
            <PageHeader
                title="Passenger requests"
                description={
                    pending
                        ? `${pending} seat request${pending === 1 ? ' is' : 's are'} waiting for your answer.`
                        : 'Seat requests from passengers for your rides.'
                }
            />
            <FilterBar
                url="/driver/requests"
                values={filters}
                fields={[
                    {
                        name: 'q',
                        type: 'search',
                        placeholder: 'Reference number, e.g. RNP-2026…',
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
                <>
                    <div className="overflow-x-auto rounded-2xl border bg-card">
                        <table className={tableCls}>
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    {[
                                        'Reference',
                                        'Route',
                                        'Passenger',
                                        'Departure',
                                        'Seats',
                                        'Total',
                                        'Status',
                                        'Payment',
                                    ].map((h) => (
                                        <th key={h} className={thCls}>
                                            {h}
                                        </th>
                                    ))}
                                    <th className={thCls}>
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {bookings.data.map((b) => (
                                    <tr key={b.id} className="hover:bg-muted/30">
                                        <td className={`${tdCls} font-mono text-xs`}>
                                            <Link
                                                href={`/bookings/${b.id}`}
                                                className="text-ocean hover:underline dark:text-foam"
                                            >
                                                {b.reference_no}
                                            </Link>
                                        </td>
                                        <td className={tdCls}>{b.route}</td>
                                        <td className={tdCls}>{b.passenger}</td>
                                        <td className={`${tdCls} whitespace-nowrap`}>
                                            {fmtDateTime(b.departure_at)}
                                        </td>
                                        <td className={tdCls}>{b.seats}</td>
                                        <td className={tdCls}>{peso(b.total_fare)}</td>
                                        <td className={tdCls}>
                                            <StatusBadge status={b.status} />
                                        </td>
                                        <td className={tdCls}>
                                            {b.payment_status ? (
                                                <StatusBadge status={b.payment_status} />
                                            ) : (
                                                '—'
                                            )}
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
                                                {['pending', 'approved', 'confirmed'].includes(
                                                    b.status,
                                                ) && (
                                                    <ReasonDialog
                                                        title={`Cancel ${b.reference_no}?`}
                                                        description="The passenger will be notified. This cannot be undone."
                                                        confirmLabel="Cancel booking"
                                                        destructive
                                                        onConfirm={(r) => act(b.id, 'cancel', r)}
                                                        trigger={
                                                            <Button size="sm" variant="outline">
                                                                Cancel
                                                            </Button>
                                                        }
                                                    />
                                                )}
                                                {b.payment_status === 'paid' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        asChild
                                                        aria-label="Receipt"
                                                    >
                                                        <Link href={`/bookings/${b.id}/receipt`}>
                                                            <Receipt />
                                                        </Link>
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    asChild
                                                    aria-label="View request"
                                                >
                                                    <Link href={`/bookings/${b.id}`}>
                                                        <Eye />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pager page={bookings} />
                </>
            ) : (
                <EmptyState>No passenger requests yet.</EmptyState>
            )}
        </>
    );
}
