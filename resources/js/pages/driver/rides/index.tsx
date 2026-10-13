import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
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
    price_per_seat: string;
    trip_status: string;
};

export default function DriverRides({
    rides,
    filters,
}: {
    rides: Paginated<Ride>;
    filters: Record<string, string>;
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
