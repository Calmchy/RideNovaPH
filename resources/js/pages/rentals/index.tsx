// "Rent a vehicle" (self-drive): vehicles other drivers put up for rent, my requests, and for owners
// their own vehicles (switch + price per day) and the requests they received.
import { Head, Link, router } from '@inertiajs/react';
import { Car, Users } from 'lucide-react';
import { useState } from 'react';
import BookingsTabs from '@/components/bookings-tabs';
import {
    EmptyState,
    inputCls,
    PageHeader,
    Panel,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { fmtDateTime, LIFT_3D, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Row = {
    id: number;
    reference_no: string;
    status: string;
    other: string;
    vehicle: string;
    start_at: string;
    end_at: string;
    days: number;
    total_price: string;
};

type Props = {
    vehicles: {
        id: number;
        name: string;
        color: string;
        seats: number;
        year: number | null;
        daily_rate: string;
        owner: string;
    }[];
    mine: Row[];
    incoming: Row[];
    is_owner: boolean;
    my_vehicles: {
        id: number;
        label: string;
        available_for_rent: boolean;
        daily_rate: string | null;
    }[];
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
                            'Vehicle',
                            'From',
                            'Days',
                            'Total',
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
                            <td className={tdCls}>{r.vehicle}</td>
                            <td className={tdCls}>{fmtDateTime(r.start_at)}</td>
                            <td className={tdCls}>{r.days}</td>
                            <td className={tdCls}>{peso(r.total_price)}</td>
                            <td className={tdCls}>
                                <StatusBadge status={r.status} />
                            </td>
                            <td className={tdCls}>
                                <Button asChild size="sm" variant="outline">
                                    <Link href={`/rentals/${r.id}`}>Open</Link>
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** One of MY vehicles: on/off switch + the price per day (only the owner can change it). */
function MyVehicleRow({ v }: { v: Props['my_vehicles'][number] }) {
    const [rate, setRate] = useState(v.daily_rate ?? '');
    const [on, setOn] = useState(v.available_for_rent);
    const [saving, setSaving] = useState(false);

    const save = () =>
        router.patch(
            `/rentals/vehicles/${v.id}`,
            { available_for_rent: on, daily_rate: rate === '' ? null : rate },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );

    return (
        <li className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="font-medium">{v.label}</span>
            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setOn(e.target.checked)}
                        className="size-4"
                    />
                    For rent
                </label>
                <label className="flex items-center gap-1 text-sm">
                    ₱
                    <input
                        type="number"
                        min={1}
                        max={100000}
                        step="1"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        aria-label="Price per day"
                        placeholder="per day"
                        className={`${inputCls} w-28`}
                    />
                    <span className="text-muted-foreground">/ day</span>
                </label>
                <Button
                    size="sm"
                    onClick={save}
                    disabled={saving || (on && rate === '')}
                >
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </li>
    );
}

export default function RentalsIndex({
    vehicles,
    mine,
    incoming,
    is_owner,
    my_vehicles,
}: Props) {
    return (
        <>
            <Head title="Rent a vehicle" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <PageHeader
                    title="Bookings"
                    description="Just need a vehicle? Rent one and drive it yourself. Owners set their own price per day."
                />
                <BookingsTabs active="rent" isDriver={is_owner} />

                <section className="grid gap-2">
                    <h2 className="font-serif text-2xl">Vehicles for rent</h2>
                    <p className="text-sm text-muted-foreground">
                        Pick a vehicle, tell the owner who you are, when and
                        where. The owner approves your request. Pay the owner in
                        cash at pick-up.
                    </p>
                    {vehicles.length ? (
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {vehicles.map((v) => (
                                <li
                                    key={v.id}
                                    className={`flex flex-col gap-3 rounded-2xl border bg-card p-5 ${LIFT_3D}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ocean text-white">
                                            <Car className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="truncate font-serif text-lg">
                                                {v.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {v.color}
                                                {v.year ? ` · ${v.year}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Users className="size-4" /> {v.seats}{' '}
                                        seats · owner {v.owner}
                                    </p>
                                    <p className="font-serif text-2xl">
                                        {peso(v.daily_rate)}
                                        <span className="text-sm text-muted-foreground">
                                            {' '}
                                            / day
                                        </span>
                                    </p>
                                    <Button asChild className="mt-auto">
                                        <Link href={`/rentals/new?vehicle=${v.id}`}>
                                            Rent this vehicle
                                        </Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState>
                            No vehicles are up for rent right now. Please check
                            again later.
                        </EmptyState>
                    )}
                </section>

                <Panel title="My rental requests">
                    <RequestsTable rows={mine} who="Owner" />
                </Panel>

                {is_owner && (
                    <>
                        <Panel title="My vehicles for rent">
                            {my_vehicles.length ? (
                                <ul className="divide-y">
                                    {my_vehicles.map((v) => (
                                        <MyVehicleRow key={v.id} v={v} />
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState>
                                    Add a vehicle first (Driver → Vehicles).
                                </EmptyState>
                            )}
                        </Panel>
                        <Panel title="Rental requests for my vehicles">
                            <RequestsTable rows={incoming} who="Renter" />
                        </Panel>
                    </>
                )}
            </div>
        </>
    );
}
