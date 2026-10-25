// Admin > Rides: every ride with filters; cancel a problem ride (reason required, passengers notified).
import { Head, router } from '@inertiajs/react';
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

type R = {
    id: number;
    route: string;
    driver: string;
    vehicle: string;
    departure_at: string;
    price_per_seat: string;
    seats: string;
    status: string;
    cancellation_reason: string | null;
};

export default function AdminRides({
    rides,
    cities,
    filters,
}: {
    rides: Paginated<R>;
    cities: { id: number; name: string }[];
    filters: Record<string, string>;
}) {
    return (
        <>
            <Head title="Rides" />
            <PageHeader
                title="Rides"
                description="Every published ride. Seats shows free seats / seats offered."
            />
            <FilterBar
                url="/admin/rides"
                values={filters}
                fields={[
                    {
                        name: 'q',
                        type: 'search',
                        placeholder: 'Driver name or plate number',
                    },
                    {
                        name: 'origin',
                        type: 'select',
                        placeholder: 'Any origin',
                        label: 'From',
                        options: cities.map((c) => ({
                            value: c.id,
                            label: c.name,
                        })),
                    },
                    { name: 'date', type: 'date', label: 'Date' },
                    {
                        name: 'status',
                        type: 'select',
                        placeholder: 'All',
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
                                    'Driver',
                                    'Vehicle',
                                    'Departure',
                                    'Price',
                                    'Seats',
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
                                    <td className={tdCls}>{r.driver}</td>
                                    <td className={tdCls}>{r.vehicle}</td>
                                    <td
                                        className={`${tdCls} whitespace-nowrap`}
                                    >
                                        {fmtDateTime(r.departure_at)}
                                    </td>
                                    <td className={tdCls}>
                                        {peso(r.price_per_seat)}
                                    </td>
                                    <td className={tdCls}>{r.seats}</td>
                                    <td className={tdCls}>
                                        <StatusBadge status={r.status} />
                                        {r.cancellation_reason && (
                                            <span className="mt-1 block max-w-44 text-xs text-muted-foreground">
                                                {r.cancellation_reason}
                                            </span>
                                        )}
                                    </td>
                                    <td className={tdCls}>
                                        {['scheduled', 'on_the_road'].includes(
                                            r.status,
                                        ) && (
                                            <ReasonDialog
                                                title="Cancel this ride?"
                                                description="All open bookings are cancelled and the driver and passengers are notified."
                                                reasonRequired
                                                reasonLabel="Reason"
                                                confirmLabel="Cancel ride"
                                                destructive
                                                onConfirm={(reason) =>
                                                    router.patch(
                                                        `/admin/rides/${r.id}/cancel`,
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
                <EmptyState>No rides match.</EmptyState>
            )}
            <Pager page={rides} />
        </>
    );
}
