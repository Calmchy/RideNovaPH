// Admin > ID verification: review the queue with the submitted photos shown right on the card (click one to
// enlarge it in a popup, no new tab), then approve or reject WITH a reason the user is notified about.
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
import { fmtDate, fmtDateTime, StatusBadge } from '@/components/lux';
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
import { cn } from '@/lib/utils';

type Doc = {
    id: number;
    name: string;
    email: string;
    profile: {
        user_id: number;
        photo: string | null;
        phone: string | null;
        address: string | null;
        emergency: string | null;
        member_since: string;
        account_status: string;
        driver_status: string | null;
    };
    role: string;
    id_type: string;
    has_back: boolean;
    status: string;
    remarks: string | null;
    reviewer: string | null;
    submitted_at: string;
};

const STATUSES = ['pending', 'approved', 'rejected'];

/** A submitted photo shown inline; click to enlarge in a popup. Served by an admin-only route (private disk). */
function IdPhoto({ src, label, name }: { src: string; label: string; name: string }) {
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
                        alt={`${label} of ${name}'s ID`}
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
                    Enlarged ID photo
                </DialogDescription>
                <img
                    src={src}
                    alt={`${label} of ${name}'s ID`}
                    className="max-h-[80vh] w-full rounded-lg object-contain"
                />
            </DialogContent>
        </Dialog>
    );
}


/** Who is being reviewed: photo, contact details and account info, so the admin can compare them with the ID. */
function Profile({ d }: { d: Doc }) {
    const initials = useInitials();
    const p = d.profile;
    const rows: [string, string | null][] = [
        ['Contact number', p.phone],
        ['Address', p.address],
        ['Emergency contact', p.emergency],
        ['Member since', fmtDate(p.member_since)],
        ['Account', p.account_status],
        ['Driver application', p.driver_status],
    ];

    return (
        <div className="mt-4 flex flex-wrap items-start gap-4 rounded-xl border bg-muted/30 p-4">
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
                <Link href={`/admin/users/${p.user_id}`}>Full profile</Link>
            </Button>
        </div>
    );
}

export default function AdminIdentity({
    documents,
    filters,
}: {
    documents: Paginated<Doc>;
    filters: { status: string; q: string | null };
}) {
    const decide = (d: Doc, decision: 'approved' | 'rejected', remarks = '') =>
        router.patch(
            `/admin/identity-documents/${d.id}`,
            { decision, remarks },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="ID verification" />
            <PageHeader
                title="ID verification"
                description="Images are stored privately and only open here. Every view is logged."
            />
            <nav className="flex gap-1 border-b" aria-label="Status">
                {STATUSES.map((s) => (
                    <a
                        key={s}
                        href={`/admin/identity?status=${s}`}
                        onClick={(e) => {
                            e.preventDefault();
                            router.get('/admin/identity', { status: s });
                        }}
                        className={cn(
                            '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize',
                            filters.status === s
                                ? 'border-ocean text-ocean dark:border-foam dark:text-foam'
                                : 'border-transparent text-muted-foreground',
                        )}
                    >
                        {s}
                    </a>
                ))}
            </nav>
            <FilterBar
                url="/admin/identity"
                extra={{ status: filters.status }}
                values={{ q: filters.q }}
                fields={[
                    { name: 'q', type: 'search', placeholder: 'Name or email' },
                ]}
            />

            {documents.data.length ? (
                <ul className="space-y-3">
                    {documents.data.map((d) => (
                        <li
                            key={d.id}
                            className="rounded-2xl border bg-card p-4"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="font-medium">
                                    {d.name}{' '}
                                    <span className="text-xs font-normal text-muted-foreground capitalize">
                                        · {d.role}
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {d.email} · {d.id_type} ·{' '}
                                    {fmtDateTime(d.submitted_at)}
                                </p>
                                {d.status !== 'pending' && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        <StatusBadge status={d.status} /> by{' '}
                                        {d.reviewer ?? 'admin'}
                                        {d.remarks && ` — ${d.remarks}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {d.status === 'pending' && (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                decide(d, 'approved')
                                            }
                                        >
                                            <Check /> Approve
                                        </Button>
                                        <ReasonDialog
                                            title="Reject this ID?"
                                            description="The user sees this reason and can upload a new photo."
                                            reasonLabel="Reason for the user"
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
                            </div>
                            <Profile d={d} />
                            <div className="mt-4 flex flex-wrap gap-3">
                                <IdPhoto
                                    src={`/admin/identity-documents/${d.id}/front`}
                                    label="Front"
                                    name={d.name}
                                />
                                {d.has_back && (
                                    <IdPhoto
                                        src={`/admin/identity-documents/${d.id}/back`}
                                        label="Back"
                                        name={d.name}
                                    />
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState>Nothing {filters.status} right now.</EmptyState>
            )}
            <Pager page={documents} />
        </>
    );
}
