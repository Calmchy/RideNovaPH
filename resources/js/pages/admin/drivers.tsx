// Admin > Drivers: licence review (approve / reject with reason) and a quick look at each driver's vehicles.
import { Head, router } from '@inertiajs/react';
import { Check, ExternalLink, X } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    ReasonDialog,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDate, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type D = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    license_number: string;
    license_expiry: string;
    expired: boolean;
    status: string;
    remarks: string | null;
    submitted_at: string;
    vehicles: string[];
};

export default function AdminDrivers({
    drivers,
    filters,
}: {
    drivers: Paginated<D>;
    filters: Record<string, string>;
}) {
    const decide = (d: D, decision: 'approved' | 'rejected', remarks = '') =>
        router.patch(
            `/admin/drivers/${d.id}`,
            { decision, remarks },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Drivers" />
            <PageHeader
                title="Drivers"
                description="Approve a driver’s licence before they can publish rides. Rejected drivers can resubmit."
            />
            <FilterBar
                url="/admin/drivers"
                values={filters}
                fields={[
                    {
                        name: 'q',
                        type: 'search',
                        placeholder: 'Name, email or licence number',
                    },
                    {
                        name: 'status',
                        type: 'select',
                        placeholder: 'All',
                        label: 'Status',
                        options: ['pending', 'approved', 'rejected'].map(
                            (s) => ({
                                value: s,
                                label: s[0].toUpperCase() + s.slice(1),
                            }),
                        ),
                    },
                ]}
            />
            {drivers.data.length ? (
                <ul className="space-y-3">
                    {drivers.data.map((d) => (
                        <li
                            key={d.id}
                            className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_auto]"
                        >
                            <div>
                                <p className="font-medium">
                                    {d.name} <StatusBadge status={d.status} />
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {d.email}
                                    {d.phone && ` · ${d.phone}`}
                                </p>
                                <p className="mt-1 text-sm">
                                    Licence{' '}
                                    <span className="font-mono">
                                        {d.license_number}
                                    </span>{' '}
                                    · expires {fmtDate(d.license_expiry)}{' '}
                                    {d.expired && (
                                        <span className="font-semibold text-destructive">
                                            (expired)
                                        </span>
                                    )}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Vehicles:{' '}
                                    {d.vehicles.length
                                        ? d.vehicles.join(', ')
                                        : 'none registered'}
                                </p>
                                {d.remarks && (
                                    <p className="mt-1 text-xs text-destructive">
                                        Rejection reason: {d.remarks}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                <a
                                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
                                    href={`/admin/drivers/${d.id}/license`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="size-3" /> Licence
                                    photo
                                </a>
                                {d.status === 'pending' && (
                                    <>
                                        <Button
                                            size="sm"
                                            disabled={d.expired}
                                            onClick={() =>
                                                decide(d, 'approved')
                                            }
                                        >
                                            <Check /> Approve
                                        </Button>
                                        <ReasonDialog
                                            title="Reject this licence?"
                                            description="The driver sees this reason and can resubmit."
                                            reasonLabel="Reason for the driver"
                                            reasonRequired
                                            confirmLabel="Reject"
                                            destructive
                                            onConfirm={(r) =>
                                                decide(d, 'rejected', r)
                                            }
                                            trigger={
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <X /> Reject
                                                </Button>
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState>No drivers match.</EmptyState>
            )}
            <Pager page={drivers} />
        </>
    );
}
