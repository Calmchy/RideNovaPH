// Admin > Users: search + filter, open a profile, suspend / reactivate.
import { Head, Link, router } from '@inertiajs/react';
import { Check, Eye, ShieldBan } from 'lucide-react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    Pager,
    ReasonDialog,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import type { Paginated } from '@/components/kit';
import { fmtDate, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type U = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    id_verified: boolean;
    joined: string;
    is_self: boolean;
};

export default function AdminUsers({
    users,
    filters,
}: {
    users: Paginated<U>;
    filters: Record<string, string>;
}) {
    const setStatus = (u: U, status: 'active' | 'suspended', reason = '') =>
        router.patch(
            `/admin/users/${u.id}`,
            { status, reason },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Users" />
            <PageHeader
                title="Users"
                description="Every account on the platform. Suspending signs the person out immediately."
            />
            <FilterBar
                url="/admin/users"
                values={filters}
                fields={[
                    { name: 'q', type: 'search', placeholder: 'Name or email' },
                    {
                        name: 'role',
                        type: 'select',
                        placeholder: 'All roles',
                        label: 'Role',
                        options: ['passenger', 'driver', 'admin'].map((r) => ({
                            value: r,
                            label: r[0].toUpperCase() + r.slice(1),
                        })),
                    },
                    {
                        name: 'status',
                        type: 'select',
                        placeholder: 'Any status',
                        label: 'Status',
                        options: [
                            { value: 'active', label: 'Active' },
                            { value: 'suspended', label: 'Suspended' },
                        ],
                    },
                ]}
            />
            {users.data.length ? (
                <div className="overflow-x-auto rounded-2xl border bg-card">
                    <table className={tableCls}>
                        <thead className="border-b bg-muted/50">
                            <tr>
                                {[
                                    'Name',
                                    'Role',
                                    'Contact',
                                    'ID',
                                    'Status',
                                    'Joined',
                                ].map((h) => (
                                    <th key={h} className={thCls}>
                                        {h}
                                    </th>
                                ))}
                                <th className={thCls} />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.data.map((u) => (
                                <tr key={u.id} className="hover:bg-muted/30">
                                    <td className={tdCls}>
                                        <p className="font-medium">{u.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {u.email}
                                        </p>
                                    </td>
                                    <td className={`${tdCls} capitalize`}>
                                        {u.role}
                                    </td>
                                    <td className={tdCls}>{u.phone ?? '—'}</td>
                                    <td className={tdCls}>
                                        {u.id_verified ? (
                                            <span className="inline-flex items-center gap-1 text-ocean dark:text-foam">
                                                <Check className="size-4" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td className={tdCls}>
                                        <StatusBadge status={u.status} />
                                    </td>
                                    <td
                                        className={`${tdCls} whitespace-nowrap`}
                                    >
                                        {fmtDate(u.joined)}
                                    </td>
                                    <td className={tdCls}>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                asChild
                                                aria-label="View user"
                                            >
                                                <Link
                                                    href={`/admin/users/${u.id}`}
                                                >
                                                    <Eye />
                                                </Link>
                                            </Button>
                                            {u.role !== 'admin' &&
                                                !u.is_self &&
                                                (u.status === 'active' ? (
                                                    <ReasonDialog
                                                        title={`Suspend ${u.name}?`}
                                                        description="They are signed out right away and cannot sign in until reactivated."
                                                        confirmLabel="Suspend"
                                                        destructive
                                                        onConfirm={(r) =>
                                                            setStatus(
                                                                u,
                                                                'suspended',
                                                                r,
                                                            )
                                                        }
                                                        trigger={
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                            >
                                                                <ShieldBan />{' '}
                                                                Suspend
                                                            </Button>
                                                        }
                                                    />
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            setStatus(
                                                                u,
                                                                'active',
                                                            )
                                                        }
                                                    >
                                                        Reactivate
                                                    </Button>
                                                ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState>No users match.</EmptyState>
            )}
            <Pager page={users} />
        </>
    );
}
