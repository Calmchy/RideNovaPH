// Admin > Drivers: licence review (approve / reject with reason) and a quick look at each driver's vehicles.
import { Head, Link, router } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    ReasonDialog,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDate, StatusBadge } from '@/components/lux';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';

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

/** A submitted photo shown on the card; click to enlarge in a popup (no new tab). Served by admin-only routes. */
function DocPhoto({ src, label, name }: { src: string; label: string; name: string }) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div className="grid h-32 w-48 place-items-center rounded-xl border border-dashed text-xs text-muted-foreground">
                {label}: image unavailable
            </div>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    aria-label={`Enlarge ${label} of ${name}`}
                    className="group relative cursor-zoom-in overflow-hidden rounded-xl border bg-muted/40 focus-visible:ring-2 focus-visible:ring-ocean focus-visible:outline-none"
                >
                    <img
                        src={src}
                        alt={`${label} of ${name}`}
                        loading="lazy"
                        onError={() => setFailed(true)}
                        className="h-32 w-48 object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-0.5 text-left text-[11px] font-medium text-white">
                        {label}
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="w-auto max-w-[94vw] p-3 sm:max-w-3xl">
                <DialogTitle className="text-sm">
                    {label} · {name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Enlarged photo
                </DialogDescription>
                <img
                    src={src}
                    alt={`${label} of ${name}`}
                    className="max-h-[80vh] w-full rounded-lg object-contain"
                />
            </DialogContent>
        </Dialog>
    );
}

/** Who is being reviewed: photo and account details, so the admin can compare them with the documents. */
function DriverProfile({ d }: { d: D }) {
    const initials = useInitials();
    const p = d.profile;
    const rows: [string, string | null][] = [
        ['Contact number', d.phone],
        ['Address', p.address],
        ['Emergency contact', p.emergency],
        ['Member since', fmtDate(p.member_since)],
        ['Account', p.account_status],
    ];

    return (
        <div className="flex flex-wrap items-start gap-4 rounded-xl border bg-muted/30 p-4 md:col-span-2">
            <Avatar className="size-14">
                {p.photo && <AvatarImage src={p.photo} alt={d.name} />}
                <AvatarFallback className="bg-ocean font-semibold text-white">
                    {initials(d.name)}
                </AvatarFallback>
            </Avatar>
            <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {rows
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                        <div key={k}>
                            <dt className="text-xs text-muted-foreground">
                                {k}
                            </dt>
                            <dd className="font-medium capitalize">{v}</dd>
                        </div>
                    ))}
            </dl>
            <Button asChild size="sm" variant="outline">
                <Link href={`/admin/users/${d.id}`}>Full profile</Link>
            </Button>
        </div>
    );
}

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
                            className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto]"
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
                            <DriverProfile d={d} />
                            <div className="flex flex-wrap gap-3 md:col-span-2">
                                <DocPhoto
                                    src={`/admin/drivers/${d.id}/license`}
                                    label="Licence front"
                                    name={d.name}
                                />
                                {d.has_license_back ? (
                                    <DocPhoto
                                        src={`/admin/drivers/${d.id}/license/back`}
                                        label="Licence back"
                                        name={d.name}
                                    />
                                ) : (
                                    <div className="grid h-32 w-48 place-items-center rounded-xl border border-dashed text-xs text-muted-foreground">
                                        Licence back: not uploaded
                                    </div>
                                )}
                                {d.cors.map((c) => (
                                    <DocPhoto
                                        key={c.id}
                                        src={`/admin/vehicles/${c.id}/cor`}
                                        label={`COR · ${c.plate}`}
                                        name={d.name}
                                    />
                                ))}
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
