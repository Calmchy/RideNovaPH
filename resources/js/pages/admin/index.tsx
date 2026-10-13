// Admin overview: headline numbers, the queues waiting for an admin, a 7-day booking chart, latest bookings.
import { Head, Link } from '@inertiajs/react';
import {
    Banknote,
    BadgeCheck,
    Car,
    CalendarCheck,
    Route as RouteIcon,
    Users,
    Wallet,
} from 'lucide-react';
import {
    EmptyState,
    PageHeader,
    Panel,
    StatCard,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { peso, StatusBadge } from '@/components/lux';

type Props = {
    stats: {
        users: number;
        drivers: number;
        open_rides: number;
        bookings: number;
        revenue: number;
        gross: number;
    };
    queues: { ids: number; drivers: number; pending_bookings: number };
    chart: { label: string; count: number }[];
    recent: {
        id: number;
        reference_no: string;
        passenger: string;
        route: string;
        status: string;
        amount: string | null;
    }[];
};

export default function AdminIndex({ stats, queues, chart, recent }: Props) {
    const max = Math.max(1, ...chart.map((c) => c.count));
    const todo = [
        {
            label: 'IDs to review',
            n: queues.ids,
            href: '/admin/identity?status=pending',
            icon: BadgeCheck,
        },
        {
            label: 'Driver licences to review',
            n: queues.drivers,
            href: '/admin/drivers?status=pending',
            icon: Car,
        },
        {
            label: 'Bookings awaiting a driver',
            n: queues.pending_bookings,
            href: '/admin/bookings?status=pending',
            icon: CalendarCheck,
        },
    ];

    return (
        <>
            <Head title="Admin" />
            <PageHeader
                title="Admin overview"
                description="What needs your attention and how the platform is doing."
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {todo.map((t) => (
                    <Link
                        key={t.label}
                        href={t.href}
                        className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <span
                            className={`grid size-12 place-items-center rounded-xl text-xl font-semibold ${t.n ? 'bg-coral text-deep' : 'bg-muted text-muted-foreground'}`}
                        >
                            {t.n}
                        </span>
                        <span className="text-sm font-medium">
                            <t.icon className="mb-1 size-4 text-ocean dark:text-foam" />
                            {t.label}
                        </span>
                    </Link>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Users" value={stats.users} icon={Users} />
                <StatCard
                    label="Approved drivers"
                    value={stats.drivers}
                    icon={Car}
                    tone="foam"
                />
                <StatCard
                    label="Open rides"
                    value={stats.open_rides}
                    icon={RouteIcon}
                    tone="sand"
                />
                <StatCard
                    label="Bookings"
                    value={stats.bookings}
                    icon={CalendarCheck}
                    tone="deep"
                />
                <StatCard
                    label="Gross fares (paid)"
                    value={peso(stats.gross)}
                    icon={Banknote}
                />
                <StatCard
                    label="Platform revenue"
                    value={peso(stats.revenue)}
                    hint="Fees on paid trips"
                    icon={Wallet}
                    tone="coral"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <Panel title="Bookings, last 7 days">
                    <div
                        className="flex h-44 items-end gap-2 p-5"
                        role="img"
                        aria-label="Bookings per day for the last 7 days"
                    >
                        {chart.map((c) => (
                            <div
                                key={c.label}
                                className="flex flex-1 flex-col items-center gap-1"
                            >
                                <span className="text-xs text-muted-foreground">
                                    {c.count}
                                </span>
                                <div
                                    className="w-full rounded-t-md bg-ocean"
                                    style={{
                                        height: `${(c.count / max) * 100}%`,
                                        minHeight: c.count ? 6 : 2,
                                    }}
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    {c.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </Panel>

                <Panel
                    title="Latest bookings"
                    actions={
                        <Link
                            href="/admin/bookings"
                            className="text-sm text-ocean hover:underline dark:text-foam"
                        >
                            View all →
                        </Link>
                    }
                >
                    {recent.length ? (
                        <div className="overflow-x-auto">
                            <table className={tableCls}>
                                <thead className="border-b bg-muted/50">
                                    <tr>
                                        {[
                                            'Reference',
                                            'Passenger',
                                            'Route',
                                            'Status',
                                            'Amount',
                                        ].map((h) => (
                                            <th key={h} className={thCls}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recent.map((r) => (
                                        <tr key={r.id}>
                                            <td
                                                className={`${tdCls} font-mono text-xs`}
                                            >
                                                <Link
                                                    href={`/bookings/${r.id}`}
                                                    className="text-ocean hover:underline dark:text-foam"
                                                >
                                                    {r.reference_no}
                                                </Link>
                                            </td>
                                            <td className={tdCls}>
                                                {r.passenger}
                                            </td>
                                            <td className={tdCls}>{r.route}</td>
                                            <td className={tdCls}>
                                                <StatusBadge
                                                    status={r.status}
                                                />
                                            </td>
                                            <td className={tdCls}>
                                                {r.amount
                                                    ? peso(r.amount)
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-5">
                            <EmptyState>No bookings yet.</EmptyState>
                        </div>
                    )}
                </Panel>
            </div>
        </>
    );
}
