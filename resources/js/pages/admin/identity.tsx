// Admin > ID verification: review the queue, open the private images, approve or reject WITH a reason.
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
import { fmtDateTime, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Doc = {
    id: number;
    name: string;
    email: string;
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
    filters: { status: string; q: string | null };
}) {
    const decide = (d: Doc, decision: 'approved' | 'rejected', remarks = '') =>
        router.patch(
            `/admin/identity-documents/${d.id}`,
            { decision, remarks },
            { preserveScroll: true },
        );
    const img =
        'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted';

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
                            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4"
                        >
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
                                <a
                                    className={img}
                                    href={`/admin/identity-documents/${d.id}/front`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="size-3" /> Front
                                </a>
                                {d.has_back && (
                                    <a
                                        className={img}
                                        href={`/admin/identity-documents/${d.id}/back`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="size-3" /> Back
                                    </a>
                                )}
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
