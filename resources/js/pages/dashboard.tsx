// Dashboard in the "Grand Taxi" layout: dark quick-menu on the left, slideshow + stats + trips in the
// middle, top drivers and verification status on the right.
import { Head, Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Banknote,
    CalendarCheck,
    Car,
    ReceiptText,
    Route,
    Star,
    UserCog,
} from 'lucide-react';
import DashboardSlideshow from '@/components/dashboard-slideshow';
import type { Slide } from '@/components/dashboard-slideshow';
import { EmptyState, StatCard } from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { cn } from '@/lib/utils';

type Props = {
    slides: Slide[];
    id_status: 'pending' | 'approved' | 'rejected' | null;
    stats: {
        upcoming: number;
        completed: number;
        spent: number;
        my_pending: number;
        awaiting_my_approval: number;
        earned: number | null;
        active_rides: number | null;
    };
    upcoming: {
        id: number;
        reference_no: string;
        status: string;
        route: string;
        departure_at: string;
    }[];
    drivers: {
        id: number;
        name: string;
        rating: number | null;
        reviews: number;
        next_ride: { id: number; route: string; departure_at: string } | null;
    }[];
};

const ID_COPY = {
    none: {
        title: 'Verify your ID',
        text: 'Upload a valid ID to start booking rides.',
        cta: 'Upload ID',
        tone: 'bg-coral/15',
    },
    pending: {
        title: 'ID under review',
        text: 'An admin is checking your ID.',
        cta: 'View status',
        tone: 'bg-sand/40',
    },
    approved: {
        title: 'ID verified',
        text: 'You can reserve seats on any ride.',
        cta: 'View status',
        tone: 'bg-foam/40',
    },
    rejected: {
        title: 'ID needs a new upload',
        text: 'Your last upload was not accepted.',
        cta: 'Upload again',
        tone: 'bg-coral/15',
    },
} as const;

export default function Dashboard({
    slides,
    id_status,
    stats,
    upcoming,
    drivers,
}: Props) {
    const { auth } = usePage().props;
    const idCopy = ID_COPY[id_status ?? 'none'];

    const menu = [
        {
            title: 'Bookings',
            href: '/bookings',
            icon: CalendarCheck,
            badge: stats.awaiting_my_approval,
        },
        { title: 'Find a ride', href: '/bookings?tab=find', icon: Route },
        { title: 'Transactions', href: '/transactions', icon: ReceiptText },
        ...(auth.isDriver
            ? [{ title: 'Driver hub', href: '/driver', icon: Car }]
            : []),
        { title: 'Verify ID', href: '/identity', icon: BadgeCheck },
        { title: 'Profile', href: '/settings/profile', icon: UserCog },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto grid w-full max-w-7xl gap-6 p-4 md:p-8 lg:grid-cols-[13rem_1fr_19rem]">
                {/* Left: dark quick menu */}
                <aside className="h-fit rounded-2xl bg-deep p-3 text-foam shadow-sm lg:sticky lg:top-6">
                    <p className="px-3 pt-2 pb-3 text-[11px] tracking-widest text-foam/60 uppercase">
                        Quick menu
                    </p>
                    <nav
                        className="flex gap-1 overflow-x-auto lg:flex-col"
                        aria-label="Quick menu"
                    >
                        {menu.map((m) => (
                            <Link
                                key={m.title}
                                href={m.href}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition hover:bg-ocean/40 hover:text-white"
                            >
                                <m.icon className="size-4 text-sand" />
                                {m.title}
                                {(m.badge ?? 0) > 0 && (
                                    <span className="ml-auto rounded-full bg-coral px-1.5 text-[11px] font-bold text-deep">
                                        {m.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>
                </aside>

                {/* Middle */}
                <div className="min-w-0 space-y-6">
                    <header>
                        <p className="text-xs tracking-[0.3em] text-coral-ink uppercase">
                            Welcome back
                        </p>
                        <h1 className="mt-1 font-serif text-3xl md:text-4xl">
                            {auth.user?.name?.split(' ')[0]}, where to next?
                        </h1>
                    </header>

                    <DashboardSlideshow slides={slides} />

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Upcoming trips"
                            value={stats.upcoming}
                            icon={CalendarCheck}
                        />
                        <StatCard
                            label="Completed"
                            value={stats.completed}
                            icon={Route}
                            tone="foam"
                        />
                        <StatCard
                            label="Total spent"
                            value={peso(stats.spent)}
                            icon={Banknote}
                            tone="sand"
                        />
                        {stats.earned !== null ? (
                            // Drivers: earnings, plus how many passenger requests need their answer.
                            <StatCard
                                label="Driver earnings"
                                value={peso(stats.earned)}
                                hint={`${stats.active_rides} open ride(s) · ${stats.awaiting_my_approval} request(s) to approve`}
                                icon={Car}
                                tone="deep"
                            />
                        ) : (
                            // Passengers: their own bookings still waiting for a driver.
                            <StatCard
                                label="Awaiting driver"
                                value={stats.my_pending}
                                hint="Your requests pending approval"
                                icon={BadgeCheck}
                                tone="coral"
                            />
                        )}
                    </div>

                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-serif text-2xl">
                                Your upcoming trips
                            </h2>
                            <Link
                                href="/bookings?tab=mine"
                                className="text-sm text-ocean hover:underline dark:text-foam"
                            >
                                All bookings →
                            </Link>
                        </div>
                        {upcoming.length ? (
                            <div className="divide-y overflow-hidden rounded-2xl border bg-card">
                                {upcoming.map((b) => (
                                    <Link
                                        key={b.id}
                                        href={`/bookings/${b.id}`}
                                        className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {b.route}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {fmtDateTime(b.departure_at)} ·{' '}
                                                <span className="font-mono text-xs">
                                                    {b.reference_no}
                                                </span>
                                            </p>
                                        </div>
                                        <StatusBadge status={b.status} />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <EmptyState>
                                No upcoming trips.{' '}
                                <Link
                                    href="/bookings?tab=find"
                                    className="text-ocean underline dark:text-foam"
                                >
                                    Find a ride
                                </Link>
                            </EmptyState>
                        )}
                    </section>
                </div>

                {/* Right: verification + top drivers */}
                <aside className="space-y-6">
                    <Link
                        href="/identity"
                        className={cn(
                            'block rounded-2xl border p-5 transition hover:shadow-md',
                            idCopy.tone,
                        )}
                    >
                        <BadgeCheck className="size-6 text-ocean dark:text-foam" />
                        <p className="mt-2 font-semibold">{idCopy.title}</p>
                        <p className="text-sm text-muted-foreground">
                            {idCopy.text}
                        </p>
                        <p className="mt-2 text-sm font-medium text-ocean dark:text-foam">
                            {idCopy.cta} →
                        </p>
                    </Link>

                    <section className="rounded-2xl border bg-card p-5 shadow-sm">
                        <h2 className="mb-3 font-semibold">Top drivers</h2>
                        {drivers.length ? (
                            <ul className="space-y-4">
                                {drivers.map((d) => (
                                    <li
                                        key={d.id}
                                        className="flex items-start gap-3"
                                    >
                                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-deep text-sm font-semibold text-sand">
                                            {d.name.slice(0, 1)}
                                        </span>
                                        <div className="min-w-0 text-sm">
                                            <p className="font-medium">
                                                {d.name}
                                            </p>
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Star className="size-3 text-sand" />
                                                {d.rating ?? 'New'}
                                                {d.reviews > 0 &&
                                                    ` (${d.reviews})`}
                                            </p>
                                            {d.next_ride ? (
                                                <Link
                                                    href={`/rides/${d.next_ride.id}`}
                                                    className="mt-1 block truncate text-xs text-ocean hover:underline dark:text-foam"
                                                >
                                                    {d.next_ride.route} ·{' '}
                                                    {fmtDateTime(
                                                        d.next_ride
                                                            .departure_at,
                                                    )}
                                                </Link>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    No open rides
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No drivers yet.
                            </p>
                        )}
                    </section>
                </aside>
            </div>
        </>
    );
}
