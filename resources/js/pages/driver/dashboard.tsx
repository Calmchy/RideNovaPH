import { Head, Link } from '@inertiajs/react';
import {
    Banknote,
    CalendarClock,
    Car,
    Clock,
    Percent,
    Plus,
    UsersRound,
} from 'lucide-react';
import { EmptyState, PageHeader, Panel, StatCard } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    application: {
        status: 'pending' | 'approved' | 'rejected' | null;
        remarks: string | null;
    };
    vehicles_count: number;
    stats: {
        earned: number;
        pending_cash: number;
        fees_paid: number;
        open_rides: number;
        pending_requests: number;
        completed_trips: number;
    };
    upcoming: {
        id: number;
        route: string;
        departure_at: string;
        seats_offered: number;
        seats_taken: number;
        trip_status: string;
    }[];
};

export default function DriverDashboard({
    application,
    vehicles_count,
    stats,
    upcoming,
}: Props) {
    const approved = application.status === 'approved';
    // The next thing a driver has to do, in order.
    const todo = !application.status
        ? {
              text: 'Submit your driver licence to get approved.',
              href: '/driver/apply',
              cta: 'Submit licence',
          }
        : application.status === 'rejected'
          ? {
                text: `Your licence was rejected: ${application.remarks ?? 'no reason given'}`,
                href: '/driver/apply',
                cta: 'Resubmit',
            }
          : application.status === 'pending'
            ? {
                  text: 'Your licence is being reviewed. You can register your vehicle meanwhile.',
                  href: '/driver/vehicles',
                  cta: 'Register vehicle',
              }
            : vehicles_count === 0
              ? {
                    text: 'Register your vehicle to start publishing rides.',
                    href: '/driver/vehicles',
                    cta: 'Register vehicle',
                }
              : null;

    return (
        <>
            <Head title="Driver" />
            <PageHeader
                title="Driver hub"
                description="Your earnings, passenger requests and upcoming trips."
                actions={
                    approved && vehicles_count > 0 ? (
                        <Button asChild>
                            <Link href="/driver/rides/create">
                                <Plus /> Publish a ride
                            </Link>
                        </Button>
                    ) : undefined
                }
            />

            {todo && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-sand/30 p-4 text-sm">
                    <p>{todo.text}</p>
                    <Button asChild size="sm">
                        <Link href={todo.href}>{todo.cta}</Link>
                    </Button>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Earned (paid)"
                    value={peso(stats.earned)}
                    icon={Banknote}
                />
                <StatCard
                    label="Cash to collect"
                    value={peso(stats.pending_cash)}
                    icon={Clock}
                    tone="sand"
                />
                <StatCard
                    label="Platform fees"
                    value={peso(stats.fees_paid)}
                    icon={Percent}
                    tone="foam"
                />
                <StatCard
                    label="Open rides"
                    value={stats.open_rides}
                    icon={Car}
                />
                <StatCard
                    label="Requests to answer"
                    value={stats.pending_requests}
                    icon={UsersRound}
                    tone="coral"
                    hint="Approve in Bookings → Requests"
                />
                <StatCard
                    label="Completed trips"
                    value={stats.completed_trips}
                    icon={CalendarClock}
                    tone="deep"
                />
            </div>

            <Panel
                title="Upcoming rides"
                actions={
                    <Link
                        href="/driver/rides"
                        className="text-sm text-ocean hover:underline dark:text-foam"
                    >
                        All rides →
                    </Link>
                }
            >
                {upcoming.length ? (
                    <ul className="divide-y">
                        {upcoming.map((r) => (
                            <li key={r.id}>
                                <Link
                                    href={`/driver/rides/${r.id}`}
                                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40"
                                >
                                    <div>
                                        <p className="font-medium">{r.route}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {fmtDateTime(r.departure_at)} ·{' '}
                                            {r.seats_taken}/{r.seats_offered}{' '}
                                            seats booked
                                        </p>
                                    </div>
                                    <StatusBadge status={r.trip_status} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-5">
                        <EmptyState>
                            No open rides. Publish one so passengers can book.
                        </EmptyState>
                    </div>
                )}
            </Panel>
        </>
    );
}
