// Admin > one user: contact details, verification state and recent bookings.
import { Head, Link } from '@inertiajs/react';
import { EmptyState, PageHeader, Panel } from '@/components/kit';
import { fmtDate, StatusBadge } from '@/components/lux';

type Props = {
    user: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        address: string | null;
        emergency_contact: string;
        role: string;
        status: string;
        joined: string;
        id_verified: boolean;
        id_status: string | null;
        driver_status: string | null;
        vehicles: { id: number; plate: string; seats: number }[];
        bookings: number;
    };
    bookings: {
        id: number;
        reference_no: string;
        status: string;
        route: string;
    }[];
};

export default function AdminUserShow({ user: u, bookings }: Props) {
    const rows: [string, React.ReactNode][] = [
        ['Email', u.email],
        ['Mobile', u.phone ?? '—'],
        ['Address', u.address ?? '—'],
        ['Emergency contact', u.emergency_contact || '—'],
        ['Member since', fmtDate(u.joined)],
        [
            'Personal ID',
            u.id_status ? (
                <StatusBadge status={u.id_status} />
            ) : (
                'Not submitted'
            ),
        ],
        ...(u.role === 'driver'
            ? ([
                  [
                      'Driver licence',
                      u.driver_status ? (
                          <StatusBadge status={u.driver_status} />
                      ) : (
                          'Not submitted'
                      ),
                  ],
                  [
                      'Vehicles',
                      u.vehicles
                          .map((v) => `${v.plate} (${v.seats} seats)`)
                          .join(', ') || '—',
                  ],
              ] as [string, React.ReactNode][])
            : []),
    ];

    return (
        <>
            <Head title={u.name} />
            <Link
                href="/admin/users"
                className="text-sm text-muted-foreground hover:text-foreground"
            >
                ← Users
            </Link>
            <PageHeader
                title={u.name}
                description={`${u.role} · ${u.bookings} booking(s)`}
                actions={<StatusBadge status={u.status} />}
            />
            <Panel title="Details">
                <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                    {rows.map(([k, v]) => (
                        <div key={k}>
                            <dt className="text-xs text-muted-foreground">
                                {k}
                            </dt>
                            <dd className="mt-0.5">{v}</dd>
                        </div>
                    ))}
                </dl>
            </Panel>
            <Panel title="Recent bookings">
                {bookings.length ? (
                    <ul className="divide-y">
                        {bookings.map((b) => (
                            <li key={b.id}>
                                <Link
                                    href={`/bookings/${b.id}`}
                                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40"
                                >
                                    <span>
                                        <span className="font-mono text-xs">
                                            {b.reference_no}
                                        </span>{' '}
                                        · {b.route}
                                    </span>
                                    <StatusBadge status={b.status} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-5">
                        <EmptyState>No bookings.</EmptyState>
                    </div>
                )}
            </Panel>
        </>
    );
}
