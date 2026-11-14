// Admin > Vehicles: look at the photos and COR a driver uploaded, then approve or reject with a reason.
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
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type V = {
    id: number;
    name: string;
    color: string;
    plate_number: string;
    vin: string | null;
    seats: number;
    year: number | null;
    description: string | null;
    owner: { id: number; name: string; email: string; phone: string | null };
    photos: { key: string; label: string; url: string | null }[];
    has_cor: boolean;
    status: string;
    remarks: string | null;
    registered_at: string;
};

/** A submitted photo; click to enlarge in a popup. */
function Photo({
    src,
    label,
    name,
}: {
    src: string | null;
    label: string;
    name: string;
}) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                {label}: not uploaded
            </div>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    aria-label={`Enlarge ${label} of ${name}`}
                    className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-muted/40 focus-visible:ring-2 focus-visible:ring-ocean focus-visible:outline-none"
                >
                    <img
                        src={src}
                        alt={`${label} of ${name}`}
                        loading="lazy"
                        onError={() => setFailed(true)}
                        className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-0.5 text-left text-[11px] font-medium text-white">
                        {label}
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="w-auto max-w-[94vw] p-3 sm:max-w-3xl">
                <DialogTitle className="sr-only">
                    {label} of {name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Enlarged photo for review.
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

export default function AdminVehicles({
    vehicles,
    filters,
    pending_count,
}: {
    vehicles: Paginated<V>;
    filters: Record<string, string>;
    pending_count: number;
}) {
    const decide = (v: V, decision: 'approved' | 'rejected', remarks = '') =>
        router.patch(
            `/admin/vehicles/${v.id}`,
            { decision, remarks },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Vehicles" />
            <PageHeader
                title="Vehicles"
                description={`Check each vehicle's photos and COR before it can carry rides or be listed for rent. ${pending_count} waiting for review.`}
            />
            <FilterBar
                url="/admin/vehicles"
                values={filters}
                fields={[
                    {
                        name: 'q',
                        type: 'search',
                        placeholder: 'Plate, VIN or driver name',
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
            {vehicles.data.length ? (
                <ul className="space-y-5">
                    {vehicles.data.map((v) => (
                        <li
                            key={v.id}
                            className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                        >
                            {/* header: what it is, its status, and the decision buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="font-serif text-xl">
                                        {v.name}
                                    </h2>
                                    <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                                        {v.color}
                                    </span>
                                    <StatusBadge status={v.status} />
                                </div>
                                <div className="flex items-center gap-2">
                                    {v.status !== 'approved' && (
                                        <Button
                                            size="sm"
                                            disabled={!v.has_cor}
                                            title={
                                                v.has_cor
                                                    ? undefined
                                                    : 'No COR uploaded yet'
                                            }
                                            onClick={() =>
                                                decide(v, 'approved')
                                            }
                                        >
                                            <Check /> Approve
                                        </Button>
                                    )}
                                    {v.status !== 'rejected' && (
                                        <ReasonDialog
                                            title="Reject this vehicle?"
                                            description="The driver is notified with your reason and can fix it and resubmit."
                                            reasonRequired
                                            reasonLabel="Reason for the driver"
                                            confirmLabel="Reject"
                                            destructive
                                            onConfirm={(r) =>
                                                decide(v, 'rejected', r)
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
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                                {/* left: the facts */}
                                <div className="space-y-4">
                                    <dl className="grid grid-cols-2 gap-3 text-sm">
                                        {[
                                            [
                                                'Plate number',
                                                v.plate_number,
                                                true,
                                            ],
                                            [
                                                'VIN',
                                                v.vin ?? 'Not provided',
                                                true,
                                            ],
                                            [
                                                'Seats',
                                                `${v.seats} passengers`,
                                                false,
                                            ],
                                            [
                                                'Year',
                                                v.year ? String(v.year) : '—',
                                                false,
                                            ],
                                        ].map(([k, val, mono]) => (
                                            <div
                                                key={String(k)}
                                                className="rounded-xl bg-muted/40 px-3 py-2"
                                            >
                                                <dt className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                                    {k}
                                                </dt>
                                                <dd
                                                    className={`mt-0.5 font-medium break-all ${mono ? 'font-mono' : ''}`}
                                                >
                                                    {val}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="rounded-xl border p-3 text-sm">
                                        <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                            Owner
                                        </p>
                                        <Link
                                            href={`/admin/users/${v.owner.id}`}
                                            className="mt-0.5 block font-medium text-ocean hover:underline dark:text-foam"
                                        >
                                            {v.owner.name}
                                        </Link>
                                        <p className="text-muted-foreground">
                                            {v.owner.email}
                                        </p>
                                        {v.owner.phone && (
                                            <p className="text-muted-foreground">
                                                {v.owner.phone}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Registered{' '}
                                            {fmtDate(v.registered_at)}
                                        </p>
                                    </div>

                                    {v.description && (
                                        <blockquote className="rounded-xl border-l-4 border-ocean/60 bg-muted/30 px-4 py-2 text-sm text-muted-foreground italic">
                                            {v.description}
                                        </blockquote>
                                    )}

                                    {v.status === 'rejected' && v.remarks && (
                                        <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
                                            <span className="font-semibold">
                                                Reason sent to the driver:
                                            </span>{' '}
                                            {v.remarks}
                                        </p>
                                    )}
                                </div>

                                {/* right: the uploaded pictures and document */}
                                <div className="grid grid-cols-2 gap-3">
                                    {v.photos.map((p) => (
                                        <Photo
                                            key={p.key}
                                            src={p.url}
                                            label={`${p.label} photo`}
                                            name={v.name}
                                        />
                                    ))}
                                    <Photo
                                        src={
                                            v.has_cor
                                                ? `/admin/vehicles/${v.id}/cor`
                                                : null
                                        }
                                        label="COR (registration)"
                                        name={v.name}
                                    />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState>No vehicles match.</EmptyState>
            )}
            <Pager page={vehicles} />
        </>
    );
}
