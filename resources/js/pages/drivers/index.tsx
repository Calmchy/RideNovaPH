// "Available drivers": every registered + verified driver and the route they are on right now.
// Alphabetical on purpose (no ranking), so drivers aren't pitted against each other.
import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, MapPin } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/kit';
import { fmtDateTime, LIFT_3D, peso } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

type Driver = {
    id: number;
    name: string;
    vehicles: string[];
    current_route: {
        id: number;
        route: string;
        departure_at: string;
        price_per_seat: string;
    } | null;
    available_for_hire: boolean;
};

export default function DriversIndex({ drivers }: { drivers: Driver[] }) {
    const initials = useInitials();

    return (
        <>
            <Head title="Available drivers" />
            <div className="space-y-6 p-4 md:p-8">
                <PageHeader
                    title="Available drivers"
                    description="Verified drivers and the route they're on. Tap a driver to see their profile, or tap their route to reserve it."
                />

                {drivers.length === 0 ? (
                    <EmptyState>No verified drivers yet.</EmptyState>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {drivers.map((d) => (
                            <li key={d.id}>
                                <div
                                    className={`flex h-full flex-col gap-3 rounded-2xl border bg-card p-3 ${LIFT_3D}`}
                                >
                                    {/* Container 1: the driver. Opens the profile. */}
                                    <Link
                                        href={`/drivers/${d.id}`}
                                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/60"
                                    >
                                        <Avatar className="size-12">
                                            <AvatarFallback className="bg-ocean font-semibold text-white">
                                                {initials(d.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">
                                                {d.name}
                                            </p>
                                            <p className="inline-flex items-center gap-1 text-xs text-ocean dark:text-foam">
                                                <BadgeCheck className="size-3.5" />{' '}
                                                Verified · View profile →
                                            </p>
                                        </div>
                                    </Link>

                                    {/* Container 2: the published ride. Goes straight to Review & Reserve. */}
                                    {d.current_route ? (
                                        <Link
                                            href={`/rides/${d.current_route.id}/book`}
                                            className="rounded-xl bg-muted/50 p-3 text-sm transition hover:bg-ocean/15 focus-visible:ring-2 focus-visible:ring-ocean focus-visible:outline-none"
                                        >
                                            <p className="flex items-center gap-1.5 font-medium">
                                                <MapPin className="size-4 text-coral" />
                                                {d.current_route.route}
                                            </p>
                                            <p className="mt-0.5 text-muted-foreground">
                                                {fmtDateTime(
                                                    d.current_route
                                                        .departure_at,
                                                )}{' '}
                                                ·{' '}
                                                {peso(
                                                    d.current_route
                                                        .price_per_seat,
                                                )}{' '}
                                                / seat
                                            </p>
                                            <p className="mt-2 text-xs font-semibold text-ocean dark:text-foam">
                                                Reserve this ride →
                                            </p>
                                        </Link>
                                    ) : (
                                        <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                                            No route published right now
                                        </div>
                                    )}

                                    {d.vehicles.length > 0 && (
                                        <p className="mt-auto truncate px-2 text-xs text-muted-foreground">
                                            {d.vehicles.join(' · ')}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
