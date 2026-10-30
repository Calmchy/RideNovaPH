// Vehicle-rental pieces shown on the "Hire a driver" page: the owner's rate editor and the request tables.
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    EmptyState,
    inputCls,
    Panel,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

export type RentalRow = {
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

export type MyVehicle = {
    id: number;
    label: string;
    available_for_rent: boolean;
    daily_rate: string | null;
};

export function RentalRequestsTable({
    rows,
    who,
}: {
    rows: RentalRow[];
    who: string;
}) {
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
function MyVehicleRow({ v }: { v: MyVehicle }) {
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

/** Owner only: switch each vehicle on/off for rent and set the price per day. */
export function MyVehiclesPanel({ vehicles }: { vehicles: MyVehicle[] }) {
    return (
        <Panel title="My vehicles for rent (renter drives, you set the price per day)">
            {vehicles.length ? (
                <ul className="divide-y">
                    {vehicles.map((v) => (
                        <MyVehicleRow key={v.id} v={v} />
                    ))}
                </ul>
            ) : (
                <EmptyState>Add a vehicle first (Driver → Vehicles).</EmptyState>
            )}
        </Panel>
    );
}
