// Admin > ID verification: review the queue with the submitted photos shown right on the card (click one to
// enlarge it in a popup, no new tab), then approve or reject WITH a reason the user is notified about.
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
import { fmtDate, fmtDateTime, StatusBadge } from '@/components/lux';
import ReviewCard, { ReviewPhoto } from '@/components/review-card';
import { Button } from '@/components/ui/button';
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

export default function AdminIdentity({
    documents,
    filters,
}: {
    documents: Paginated<Doc>;
    filters: { status: string; q: string | null; role: string | null };
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
                            router.get('/admin/identity', {
                                status: s,
                                ...(filters.role ? { role: filters.role } : {}),
                                ...(filters.q ? { q: filters.q } : {}),
                            });
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
                values={{ q: filters.q, role: filters.role }}
                fields={[
                    { name: 'q', type: 'search', placeholder: 'Name or email' },
                    {
                        name: 'role',
                        type: 'select',
                        placeholder: 'All users',
                        label: 'User type',
                        options: [
                            { value: 'passenger', label: 'Passenger' },
                            { value: 'driver', label: 'Driver' },
                            { value: 'admin', label: 'Admin' },
                        ],
                    },
                ]}
            />

            {documents.data.length ? (
                <ul className="space-y-5">
                    {documents.data.map((d) => (
                        <ReviewCard
                            key={d.id}
                            title={d.name}
                            chips={
                                <>
                                    <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
                                        {d.role}
                                    </span>
                                    <StatusBadge status={d.status} />
                                </>
                            }
                            actions={
                                d.status === 'pending' && (
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
                                )
                            }
                            facts={[
                                { label: 'ID type', value: d.id_type },
                                {
                                    label: 'Submitted',
                                    value: fmtDateTime(d.submitted_at),
                                },
                                { label: 'Email', value: d.email },
                                {
                                    label: 'Sides uploaded',
                                    value: d.has_back
                                        ? 'Front and back'
                                        : 'Front only',
                                },
                            ]}
                            person={{
                                id: d.profile.user_id,
                                name: d.name,
                                photo: d.profile.photo,
                                rows: [
                                    ['Contact number', d.profile.phone],
                                    ['Address', d.profile.address],
                                    ['Emergency contact', d.profile.emergency],
                                    [
                                        'Member since',
                                        fmtDate(d.profile.member_since),
                                    ],
                                    ['Account', d.profile.account_status],
                                    [
                                        'Driver application',
                                        d.profile.driver_status,
                                    ],
                                ],
                            }}
                            note={
                                d.status !== 'pending' && (
                                    <p className="rounded-xl bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                                        {d.status === 'approved'
                                            ? 'Approved'
                                            : 'Rejected'}{' '}
                                        by {d.reviewer ?? 'admin'}
                                        {d.remarks && ` — ${d.remarks}`}
                                    </p>
                                )
                            }
                        >
                            <ReviewPhoto
                                src={`/admin/identity-documents/${d.id}/front`}
                                label="Front"
                                name={d.name}
                            />
                            <ReviewPhoto
                                src={
                                    d.has_back
                                        ? `/admin/identity-documents/${d.id}/back`
                                        : null
                                }
                                label="Back"
                                name={d.name}
                            />
                        </ReviewCard>
                    ))}
                </ul>
            ) : (
                <EmptyState>Nothing {filters.status} right now.</EmptyState>
            )}
            <Pager page={documents} />
        </>
    );
}
