// Admin > Bookings: search by reference or passenger, filter by status/date, force-cancel with a reason.
import { Head, Link, router } from '@inertiajs/react';
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

type B = {
    id: number;
    reference_no: string;
    passenger: string;
    phone: string | null;
    driver: string;
    route: string;
    departure_at: string;
    seats: number;
    status: string;
    payment_status: string | null;
    amount: string | null;
    can_cancel: boolean;
};

export default function AdminBookings({
    bookings,
    filters,
}: {
    bookings: Paginated<B>;
    filters: Record<string, string>;
}) {
    return (
        <>
            <Head title="Bookings" />
            <PageHeader
                title="Bookings"
                description="Every reservation on the platform."
            />
            <FilterBar
                url="/admin/bookings"
                values={filters}
                fields={[
                    {
                        name: 'q',
                        type: 'search',
                        placeholder: 'Reference number or passenger',
                    },
                    {
                        name: 'status',
                        type: 'select',
                        placeholder: 'All',
                        label: 'Status',
                        options: [
                            'pending',
                            'approved',
                            'confirmed',
                            'completed',
                            'cancelled',
                        ].map((s) => ({
                            value: s,
                            label: s[0].toUpperCase() + s.slice(1),
                        })),
                    },
                    { name: 'from', type: 'date', label: 'Booked from' },
                    { name: 'to', type: 'date', label: 'Booked to' },
                ]}
            />
            {bookings.data.length ? (
                <div className="overflow-x-auto rounded-2xl border bg-card">
                    <table className={tableCls}>
                        <thead className="border-b bg-muted/50">
                            <tr>
                                {[
                                    'Reference',
                                    'Passenger',
                                    'Driver',
                                    'Route',
                                    'Departure',
                                    'Seats',
                                    'Status',
                                    'Payment',
                                ].map((h) => (
                                    <th key={h} className={thCls}>
                                        {h}
                                    </th>
                                ))}
                                <th className={thCls} />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {bookings.data.map((b) => (
                                <tr key={b.id} className="hover:bg-muted/30">
                                    <td
                                        className={`${tdCls} font-mono text-xs`}
                                    >
                                        <Link
                                            href={`/bookings/${b.id}`}
                                            className="text-ocean hover:underline dark:text-foam"
                                        >
                                            {b.reference_no}
                                        </Link>
                                    </td>
                                    <td className={tdCls}>
                                        {b.passenger}
                                        <span className="block text-xs text-muted-foreground">
                                            {b.phone}
                                        </span>
                                    </td>
                                    <td className={tdCls}>{b.driver}</td>
                                    <td className={tdCls}>{b.route}</td>
                                    <td
                                        className={`${tdCls} whitespace-nowrap`}
                                    >
                                        {fmtDateTime(b.departure_at)}
                                    </td>
                                    <td className={tdCls}>{b.seats}</td>
                                    <td className={tdCls}>
                                        <StatusBadge status={b.status} />
                                    </td>
                                    <td className={tdCls}>
                                        {b.payment_status ? (
                                            <>
                                                <StatusBadge
                                                    status={b.payment_status}
                                                />
                                                <span className="ml-1 text-xs">
                                                    {b.amount && peso(b.amount)}
                                                </span>
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className={tdCls}>
                                        {b.can_cancel && (
                                            <ReasonDialog
                                                title={`Cancel ${b.reference_no}?`}
                                                description="Both sides are notified."
                                                reasonRequired
                                                confirmLabel="Cancel booking"
                                                destructive
                                                onConfirm={(reason) =>
                                                    router.patch(
                                                        `/admin/bookings/${b.id}/cancel`,
                                                        { reason },
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        Cancel
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState>No bookings match.</EmptyState>
            )}
            <Pager page={bookings} />
        </>
    );
}
