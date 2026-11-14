// Driver > Hire requests: groups asking to hire my whole vehicle, plus my "listed for hire" switch.
import { Head, Link, router } from '@inertiajs/react';
import {
    EmptyState,
    PageHeader,
    Panel,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Row = {
    id: number;
    reference_no: string;
    status: string;
    passenger: string;
    group_size: number;
    pickup_location: string;
    pickup_at: string;
    quoted_price: string | null;
};

export default function DriverHire({
    available_for_hire,
    incoming,
}: {
    available_for_hire: boolean;
    incoming: Row[];
}) {
    return (
        <>
            <Head title="Hire requests" />
            <PageHeader
                title="Hire requests"
                description="Groups who want to hire you and your vehicle for a trip. Open a request to accept the terms and set your price."
            />
            <Panel
                title="Requests from groups"
                actions={
                    <Button
                        size="sm"
                        variant={available_for_hire ? 'outline' : 'default'}
                        onClick={() =>
                            router.patch('/driver/availability', {}, { preserveScroll: true })
                        }
                    >
                        {available_for_hire
                            ? 'Listed for hire · Hide me'
                            : 'Hidden · List me for hire'}
                    </Button>
                }
            >
                {incoming.length ? (
                    <div className="overflow-x-auto">
                        <table className={tableCls}>
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    {[
                                        'Reference',
                                        'Passenger',
                                        'Group',
                                        'Pick-up',
                                        'When',
                                        'Price',
                                        'Status',
                                        '',
                                    ].map((h, i) => (
                                        <th key={i} className={thCls}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {incoming.map((r) => (
                                    <tr key={r.id}>
                                        <td className={`${tdCls} font-mono text-xs`}>
                                            {r.reference_no}
                                        </td>
                                        <td className={tdCls}>{r.passenger}</td>
                                        <td className={tdCls}>{r.group_size}</td>
                                        <td className={tdCls}>{r.pickup_location}</td>
                                        <td className={tdCls}>{fmtDateTime(r.pickup_at)}</td>
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
                ) : (
                    <EmptyState>Nothing here yet.</EmptyState>
                )}
            </Panel>
        </>
    );
}
