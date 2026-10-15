// Admin > Reports: pick a date range, see revenue, bookings by status, top routes and drivers; export CSV.
import { Head, router } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useState } from 'react';
import {
    PageHeader,
    Panel,
    StatCard,
    inputCls,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { peso } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    filters: { from: string; to: string };
    totals: {
        gross: number;
        fees: number;
        driver_earnings: number;
        bookings: number;
        new_users: number;
    };
    revenue_by_day: { day: string; fees: string; gross: string }[];
    by_status: Record<string, number>;
    top_routes: { route: string; bookings: number; seats: number }[];
    top_drivers: { name: string; trips: number; earned: string }[];
};

export default function AdminReports({
    filters,
    totals,
    revenue_by_day,
    by_status,
    top_routes,
    top_drivers,
}: Props) {
    const [range, setRange] = useState(filters);
    const qs = new URLSearchParams(range).toString();
    const maxFee = Math.max(1, ...revenue_by_day.map((d) => Number(d.fees)));
    const statuses = [
        'pending',
        'approved',
        'confirmed',
        'completed',
        'cancelled',
    ];
    const maxStatus = Math.max(1, ...statuses.map((s) => by_status[s] ?? 0));

    return (
        <>
            <Head title="Reports" />
            <PageHeader
                title="Reports"
                description="A summary for any date range."
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <a href={`/admin/reports/export/bookings?${qs}`}>
                                <Download /> Bookings CSV
                            </a>
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={`/admin/reports/export/users?${qs}`}>
                                <Download /> Users CSV
                            </a>
                        </Button>
                    </>
                }
            />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    router.get('/admin/reports', range, {
                        preserveState: true,
                    });
                }}
                className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4"
            >
                <label className="grid gap-1 text-xs text-muted-foreground">
                    From
                    <input
                        type="date"
                        value={range.from}
                        onChange={(e) =>
                            setRange({ ...range, from: e.target.value })
                        }
                        className={inputCls}
                    />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                    To
                    <input
                        type="date"
                        value={range.to}
                        onChange={(e) =>
                            setRange({ ...range, to: e.target.value })
                        }
                        className={inputCls}
                    />
                </label>
                <Button type="submit">Apply</Button>
            </form>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="Gross fares" value={peso(totals.gross)} />
                <StatCard
                    label="Platform fees"
                    value={peso(totals.fees)}
                    tone="coral"
                />
                <StatCard
                    label="Driver earnings"
                    value={peso(totals.driver_earnings)}
                    tone="foam"
                />
                <StatCard
                    label="Bookings"
                    value={totals.bookings}
                    tone="sand"
                />
                <StatCard
                    label="New users"
                    value={totals.new_users}
                    tone="deep"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Platform revenue per day">
                    {revenue_by_day.length ? (
                        <div
                            className="flex h-44 items-end gap-1 overflow-x-auto p-5"
                            role="img"
                            aria-label="Platform fees per day"
                        >
                            {revenue_by_day.map((d) => (
                                <div
                                    key={d.day}
                                    title={`${d.day}: ${peso(d.fees)}`}
                                    className="flex min-w-6 flex-1 flex-col items-center justify-end gap-1"
                                >
                                    <div
                                        className="w-full rounded-t bg-coral"
                                        style={{
                                            height: `${(Number(d.fees) / maxFee) * 100}%`,
                                            minHeight: 4,
                                        }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        {d.day.slice(5)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="p-5 text-sm text-muted-foreground">
                            No paid trips in this range.
                        </p>
                    )}
                </Panel>
                <Panel title="Bookings by status">
                    <ul className="space-y-3 p-5">
                        {statuses.map((s) => (
                            <li
                                key={s}
                                className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm"
                            >
                                <span className="capitalize">{s}</span>
                                <span className="h-2.5 rounded-full bg-muted">
                                    <span
                                        className="block h-full rounded-full bg-ocean"
                                        style={{
                                            width: `${((by_status[s] ?? 0) / maxStatus) * 100}%`,
                                        }}
                                    />
                                </span>
                                <span className="text-right text-muted-foreground">
                                    {by_status[s] ?? 0}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>
                <Panel title="Top routes">
                    <table className={tableCls}>
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className={thCls}>Route</th>
                                <th className={thCls}>Bookings</th>
                                <th className={thCls}>Seats</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {top_routes.length ? (
                                top_routes.map((r) => (
                                    <tr key={r.route}>
                                        <td className={tdCls}>{r.route}</td>
                                        <td className={tdCls}>{r.bookings}</td>
                                        <td className={tdCls}>{r.seats}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className={tdCls} colSpan={3}>
                                        No data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Panel>
                <Panel title="Top drivers by earnings">
                    <table className={tableCls}>
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className={thCls}>Driver</th>
                                <th className={thCls}>Trips</th>
                                <th className={thCls}>Earned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {top_drivers.length ? (
                                top_drivers.map((d) => (
                                    <tr key={d.name}>
                                        <td className={tdCls}>{d.name}</td>
                                        <td className={tdCls}>{d.trips}</td>
                                        <td className={tdCls}>
                                            {peso(d.earned)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className={tdCls} colSpan={3}>
                                        No data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Panel>
            </div>
        </>
    );
}
