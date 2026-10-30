// "Hire a driver" (group charter): the available-drivers banner, my requests, and (for drivers) incoming requests.
import { Head, Link, router } from '@inertiajs/react';
import BookingsTabs from '@/components/bookings-tabs';
import DriversBanner from '@/components/drivers-banner';
import type { HireDriver } from '@/components/drivers-banner';
import {
    EmptyState,
    PageHeader,
    Panel,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { MyVehiclesPanel, RentalRequestsTable } from '@/components/rental-panels';
import type { MyVehicle, RentalRow } from '@/components/rental-panels';
import { Button } from '@/components/ui/button';

type Row = {
    id: number;
    reference_no: string;
    status: string;
    other: string;
    group_size: number;
    pickup_location: string;
    pickup_at: string;
    quoted_price: string | null;
};

type Props = {
    drivers: HireDriver[];
    mine: Row[];
    incoming: Row[];
    is_driver: boolean;
    available_for_hire: boolean;
    my_rentals: RentalRow[];
    incoming_rentals: RentalRow[];
    my_vehicles: MyVehicle[];
};

function RequestsTable({ rows, who }: { rows: Row[]; who: string }) {
    if (!rows.length) {
        return <EmptyState>Nothing here yet.</EmptyState>;
    }

    return (
        <div className="overflow-x-auto">
            <table className={tableCls}>
                <thead className="border-b bg-muted/50">
                    <tr>
                        {[
                            'Reference',
                            who,
                            'Group',
                            'Pick-up',
                            'When',
                            'Price',
                            'Status',
                            '',
                        ].map((h) => (
                            <th key={h} className={thCls}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td className={`${tdCls} font-mono text-xs`}>
                                {r.reference_no}
                            </td>
                            <td className={tdCls}>{r.other}</td>
                            <td className={tdCls}>{r.group_size}</td>
                            <td className={tdCls}>{r.pickup_location}</td>
                            <td className={tdCls}>
                                {fmtDateTime(r.pickup_at)}
                            </td>
                            <td className={tdCls}>
                                {r.quoted_price ? peso(r.quoted_price) : '—'}
                            </td>
                            <td className={tdCls}>
                                <StatusBadge status={r.status} />
                            </td>
                            <td className={tdCls}>
                                <Button asChild size="sm" variant="outline">
                                    <Link href={`/charters/${r.id}`}>Open</Link>
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function CharterIndex({
    drivers,
    mine,
    incoming,
    is_driver,
    available_for_hire,
    my_rentals,
    incoming_rentals,
    my_vehicles,
}: Props) {
    return (
        <>
            <Head title="Hire a driver" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <PageHeader
                    title="Bookings"
                    description="Travelling as a group? Hire a driver for the whole vehicle. You set the trip details, the driver sets the price."
                />
                <BookingsTabs active="hire" isDriver={is_driver} />

                <section className="grid gap-2">
                    <h2 className="font-serif text-2xl">Available drivers</h2>
                    <p className="text-sm text-muted-foreground">
                        Pick a driver, send your terms, then agree on the price
                        in the chat.
                    </p>
                    {drivers.length ? (
                        <DriversBanner drivers={drivers} />
                    ) : (
                        <EmptyState>
                            No drivers are available for hire right now. Please
                            check again later.
                        </EmptyState>
                    )}
                </section>

                <Panel title="My requests">
                    <RequestsTable rows={mine} who="Driver" />
                </Panel>

                {is_driver && (
                    <Panel
                        title="Requests from groups"
                        actions={
                            <Button
                                size="sm"
                                variant={
                                    available_for_hire ? 'outline' : 'default'
                                }
                                onClick={() =>
                                    router.patch(
                                        '/driver/availability',
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                {available_for_hire
                                    ? 'Listed for hire · Hide me'
                                    : 'Hidden · List me for hire'}
                            </Button>
                        }
                    >
                        <RequestsTable rows={incoming} who="Passenger" />
                    </Panel>
                )}

                {my_rentals.length > 0 && (
                    <Panel title="My vehicle rental requests">
                        <RentalRequestsTable rows={my_rentals} who="Owner" />
                    </Panel>
                )}

                {is_driver && (
                    <>
                        <MyVehiclesPanel vehicles={my_vehicles} />
                        <Panel title="Vehicle rental requests for my vehicles">
                            <RentalRequestsTable
                                rows={incoming_rentals}
                                who="Renter"
                            />
                        </Panel>
                    </>
                )}
            </div>
        </>
    );
}
