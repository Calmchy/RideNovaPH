// Transaction history: what I paid (passengers) or earned (drivers), with status, receipts and refunds.
import { Head, Link } from '@inertiajs/react';
import { Banknote, Clock, Percent, RotateCcw } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    StatCard,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { cn } from '@/lib/utils';

type Payment = {
    id: number;
    booking_id: number;
    reference_no: string;
    receipt_no: string | null;
    route: string;
    counterpart: string | null;
    status: string;
    method: string;
    amount: string;
    platform_fee: string;
    driver_earnings: string;
    paid_at: string | null;
    created_at: string;
    refund_reason: string | null;
};

type Props = {
    view: 'spent' | 'earned';
    can_earn: boolean;
    filters: Record<string, string>;
    summary: {
        paid: number;
        pending: number;
        refunded: number;
        fees: number | null;
    };
    payments: Paginated<Payment>;
};

export default function Transactions({
    view,
    can_earn,
    filters,
    summary,
    payments,
}: Props) {
    const earned = view === 'earned';

    return (
        <>
            <Head title="Transactions" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <PageHeader
                    title="Transactions"
                    description={
                        earned
                            ? 'Your earnings after the platform fee, with a receipt for every completed trip.'
                            : 'Every payment for your trips, with receipts and refund status.'
                    }
                />

                {can_earn && (
                    <nav
                        className="flex gap-1 border-b"
                        aria-label="Transaction view"
                    >
                        {(
                            [
                                ['earned', 'Earnings'],
                                ['spent', 'My payments'],
                            ] as const
                        ).map(([id, label]) => (
                            <Link
                                key={id}
                                href={`/transactions?view=${id}`}
                                className={cn(
                                    '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
                                    view === id
                                        ? 'border-ocean text-ocean dark:border-foam dark:text-foam'
                                        : 'border-transparent text-muted-foreground',
                                )}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label={earned ? 'Earned (paid)' : 'Total paid'}
                        value={peso(summary.paid)}
                        icon={Banknote}
                    />
                    <StatCard
                        label="Pending cash"
                        value={peso(summary.pending)}
                        hint="Collected on the ride"
                        icon={Clock}
                        tone="sand"
                    />
                    <StatCard
                        label="Refunded"
                        value={peso(summary.refunded)}
                        icon={RotateCcw}
                        tone="coral"
                    />
                    {earned && (
                        <StatCard
                            label="Platform fees paid"
                            value={peso(summary.fees ?? 0)}
                            icon={Percent}
                            tone="foam"
                        />
                    )}
                </div>

                <FilterBar
                    url="/transactions"
                    extra={{ view }}
                    values={filters}
                    fields={[
                        {
                            name: 'q',
                            type: 'search',
                            placeholder: 'Receipt or reference number',
                        },
                        {
                            name: 'status',
                            type: 'select',
                            placeholder: 'All statuses',
                            label: 'Status',
                            options: [
                                'pending',
                                'paid',
                                'refunded',
                                'void',
                            ].map((s) => ({
                                value: s,
                                label: s[0].toUpperCase() + s.slice(1),
                            })),
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
                                    <th className={thCls}>Booking</th>
                                    <th className={thCls}>Route</th>
                                    {earned && (
                                        <th className={thCls}>Passenger</th>
                                    )}
                                    <th className={thCls}>Status</th>
                                    <th className={thCls}>Amount</th>
                                    {earned && <th className={thCls}>Fee</th>}
                                    {earned && (
                                        <th className={thCls}>You earn</th>
                                    )}
                                    <th className={thCls}>Date</th>
                                    <th className={thCls}>Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payments.data.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td
                                            className={cn(
                                                tdCls,
                                                'font-mono text-xs',
                                            )}
                                        >
                                            <Link
                                                href={`/bookings/${p.booking_id}`}
                                                className="text-ocean hover:underline dark:text-foam"
                                            >
                                                {p.reference_no}
                                            </Link>
                                        </td>
                                        <td className={tdCls}>{p.route}</td>
                                        {earned && (
                                            <td className={tdCls}>
                                                {p.counterpart}
                                            </td>
                                        )}
                                        <td className={tdCls}>
                                            <StatusBadge status={p.status} />
                                            {p.refund_reason && (
                                                <span className="mt-1 block max-w-48 text-xs text-muted-foreground">
                                                    {p.refund_reason}
                                                </span>
                                            )}
                                        </td>
                                        <td className={tdCls}>
                                            {peso(p.amount)}
                                        </td>
                                        {earned && (
                                            <td className={tdCls}>
                                                {peso(p.platform_fee)}
                                            </td>
                                        )}
                                        {earned && (
                                            <td
                                                className={cn(
                                                    tdCls,
                                                    'font-medium',
                                                )}
                                            >
                                                {peso(p.driver_earnings)}
                                            </td>
                                        )}
                                        <td
                                            className={cn(
                                                tdCls,
                                                'whitespace-nowrap',
                                            )}
                                        >
                                            {fmtDateTime(
                                                p.paid_at ?? p.created_at,
                                            )}
                                        </td>
                                        <td className={tdCls}>
                                            {p.receipt_no ? (
                                                <Link
                                                    href={`/bookings/${p.booking_id}/receipt`}
                                                    className="font-mono text-xs text-ocean hover:underline dark:text-foam"
                                                >
                                                    {p.receipt_no}
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState>
                        No transactions match. Payments appear here as soon as
                        you book a ride.
                    </EmptyState>
                )}
                <Pager page={payments} />
            </div>
        </>
    );
}
