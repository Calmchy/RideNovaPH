// Admin > Transactions: all payments, platform fees, driver earnings, refunds and a CSV export.
import { Head, Link, router } from '@inertiajs/react';
import { Banknote, Download, Percent, RotateCcw, Wallet } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    ReasonDialog,
    StatCard,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type P = {
    id: number;
    booking_id: number;
    reference_no: string;
    receipt_no: string | null;
    passenger: string;
    driver: string;
    route: string;
    status: string;
    amount: string;
    platform_fee: string;
    driver_earnings: string;
    paid_at: string | null;
    refund_reason: string | null;
};
type Props = {
    payments: Paginated<P>;
    filters: Record<string, string>;
    summary: {
        gross: number;
        fees: number;
        driver_earnings: number;
        refunded: number;
        pending: number;
    };
};

export default function AdminTransactions({
    payments,
    filters,
    summary,
}: Props) {
    // The export link carries the same filters the table is showing.
    const exportUrl =
        '/admin/transactions/export?' +
        new URLSearchParams(
            Object.entries(filters).filter(([, v]) => v) as [string, string][],
        ).toString();

    return (
        <>
            <Head title="Transactions" />
            <PageHeader
                title="Transactions"
                description="Cash-on-ride payments. A payment becomes “paid” when the driver completes the trip."
                actions={
                    <Button variant="outline" asChild>
                        <a href={exportUrl}>
                            <Download /> Export CSV
                        </a>
                    </Button>
                }
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    label="Gross (paid)"
                    value={peso(summary.gross)}
                    icon={Banknote}
                />
                <StatCard
                    label="Platform fees"
                    value={peso(summary.fees)}
                    icon={Percent}
                    tone="coral"
                />
                <StatCard
                    label="Driver earnings"
                    value={peso(summary.driver_earnings)}
                    icon={Wallet}
                    tone="foam"
                />
                <StatCard
                    label="Refunded"
                    value={peso(summary.refunded)}
                    icon={RotateCcw}
                    tone="deep"
                />
                <StatCard
                    label="Pending cash"
                    value={peso(summary.pending)}
                    tone="sand"
                />
            </div>
            <FilterBar
                url="/admin/transactions"
                values={filters}
                fields={[
                    {
                        name: 'q',
                        type: 'search',
                        placeholder: 'Receipt or booking reference',
                    },
                    {
                        name: 'status',
                        type: 'select',
                        placeholder: 'All',
                        label: 'Status',
                        options: ['pending', 'paid', 'refunded', 'void'].map(
                            (s) => ({
                                value: s,
                                label: s[0].toUpperCase() + s.slice(1),
                            }),
                        ),
                    },
                    { name: 'from', type: 'date', label: 'From' },
                    { name: 'to', type: 'date', label: 'To' },
                ]}
            />
            {payments.data.length ? (
                <div className="overflow-x-auto rounded-2xl border bg-card">
                    <table className={tableCls}>
                        <thead className="border-b bg-muted/50">
                            <tr>
                                {[
                                    'Receipt',
                                    'Booking',
                                    'Passenger → Driver',
                                    'Status',
                                    'Amount',
                                    'Fee',
                                    'Driver earns',
                                    'Paid',
                                ].map((h) => (
                                    <th key={h} className={thCls}>
                                        {h}
                                    </th>
                                ))}
                                <th className={thCls} />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payments.data.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/30">
                                    <td
                                        className={`${tdCls} font-mono text-xs`}
                                    >
                                        {p.receipt_no ? (
                                            <Link
                                                href={`/bookings/${p.booking_id}/receipt`}
                                                className="text-ocean hover:underline dark:text-foam"
                                            >
                                                {p.receipt_no}
                                            </Link>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td
                                        className={`${tdCls} font-mono text-xs`}
                                    >
                                        <Link
                                            href={`/bookings/${p.booking_id}`}
                                            className="text-ocean hover:underline dark:text-foam"
                                        >
                                            {p.reference_no}
                                        </Link>
                                    </td>
                                    <td className={tdCls}>
                                        {p.passenger} → {p.driver}
                                        <span className="block text-xs text-muted-foreground">
                                            {p.route}
                                        </span>
                                    </td>
                                    <td className={tdCls}>
                                        <StatusBadge status={p.status} />
                                        {p.refund_reason && (
                                            <span className="mt-1 block max-w-44 text-xs text-muted-foreground">
                                                {p.refund_reason}
                                            </span>
                                        )}
                                    </td>
                                    <td className={tdCls}>{peso(p.amount)}</td>
                                    <td className={tdCls}>
                                        {peso(p.platform_fee)}
                                    </td>
                                    <td className={tdCls}>
                                        {peso(p.driver_earnings)}
                                    </td>
                                    <td
                                        className={`${tdCls} whitespace-nowrap`}
                                    >
                                        {p.paid_at
                                            ? fmtDateTime(p.paid_at)
                                            : '—'}
                                    </td>
                                    <td className={tdCls}>
                                        {p.status === 'paid' && (
                                            <ReasonDialog
                                                title="Refund this payment?"
                                                description="The receipt stays on record and both sides are notified. Hand the money back outside the app."
                                                reasonRequired
                                                reasonLabel="Refund reason"
                                                confirmLabel="Refund"
                                                destructive
                                                onConfirm={(reason) =>
                                                    router.post(
                                                        `/admin/transactions/${p.id}/refund`,
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
                                                        Refund
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
                <EmptyState>No transactions match.</EmptyState>
            )}
            <Pager page={payments} />
        </>
    );
}
