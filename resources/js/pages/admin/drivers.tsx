// Admin > Drivers: licence review (approve / reject with reason) and a quick look at each driver's vehicles.
import { Head, router } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    ReasonDialog,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDate, StatusBadge } from '@/components/lux';
import ReviewCard, { ReviewPhoto } from '@/components/review-card';
import { Button } from '@/components/ui/button';

type D = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    profile: {
        photo: string | null;
        address: string | null;
        emergency: string | null;
        member_since: string;
        account_status: string;
    };
    license_number: string;
    license_expiry: string;
    expired: boolean;
    status: string;
    remarks: string | null;
    submitted_at: string;
    vehicles: string[];
    has_license_back: boolean;
    cors: { id: number; plate: string }[];
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
                <ul className="space-y-5">
                    {drivers.data.map((d) => (
                        <ReviewCard
                            key={d.id}
                            title={d.name}
                            chips={<StatusBadge status={d.status} />}
                            actions={
                                d.status === 'pending' && (
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
                                )
                            }
                            facts={[
                                {
                                    label: 'Licence number',
                                    value: d.license_number,
                                    mono: true,
                                },
                                {
                                    label: 'Licence expires',
                                    value: (
                                        <>
                                            {fmtDate(d.license_expiry)}
                                            {d.expired && (
                                                <span className="ml-1 font-semibold text-destructive">
                                                    (expired)
                                                </span>
                                            )}
                                        </>
                                    ),
                                },
                                { label: 'Email', value: d.email },
                                {
                                    label: 'Vehicles',
                                    value: d.vehicles.length
                                        ? d.vehicles.join(', ')
                                        : 'None registered',
                                },
                            ]}
                            person={{
                                id: d.id,
                                name: d.name,
                                photo: d.profile.photo,
                                rows: [
                                    ['Contact number', d.phone],
                                    ['Address', d.profile.address],
                                    ['Emergency contact', d.profile.emergency],
                                    [
                                        'Member since',
                                        fmtDate(d.profile.member_since),
                                    ],
                                    ['Account', d.profile.account_status],
                                ],
                            }}
                            note={
                                d.remarks && (
                                    <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
                                        <span className="font-semibold">
                                            Rejection reason:
                                        </span>{' '}
                                        {d.remarks}
                                    </p>
                                )
                            }
                        >
                            <ReviewPhoto
                                src={`/admin/drivers/${d.id}/license`}
                                label="Licence front"
                                name={d.name}
                            />
                            <ReviewPhoto
                                src={
                                    d.has_license_back
                                        ? `/admin/drivers/${d.id}/license/back`
                                        : null
                                }
                                label="Licence back"
                                name={d.name}
                            />
                            {d.cors.map((c) => (
                                <ReviewPhoto
                                    key={c.id}
                                    src={`/admin/vehicles/${c.id}/cor`}
                                    label={`COR · ${c.plate}`}
                                    name={d.name}
                                />
                            ))}
                        </ReviewCard>
                    ))}
                </ul>
            ) : (
                <EmptyState>No drivers match.</EmptyState>
            )}
            <Pager page={drivers} />
        </>
    );
}
