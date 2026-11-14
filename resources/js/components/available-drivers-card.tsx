// Dashboard card: a few verified drivers (alphabetical, never ranked) and the route they're on.
// Clicking a driver's name opens their profile; clicking their route goes straight to reserve it.
import { Link } from '@inertiajs/react';
import { fmtDateTime } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export type AvailableDriver = {
    id: number;
    name: string;
    next_ride: { id: number; route: string; departure_at: string } | null;
};

export default function AvailableDriversCard({
    drivers,
}: {
    drivers: AvailableDriver[];
}) {
    const initials = useInitials();

    return (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">Available drivers</h2>
                <Link
                    href="/drivers"
                    className="text-sm font-medium text-ocean hover:underline dark:text-foam"
                >
                    View all →
                </Link>
            </div>

            {drivers.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                    No verified drivers yet.
                </p>
            ) : (
                <ul className="mt-3 space-y-1">
                    {drivers.map((d) => (
                        <li key={d.id} className="rounded-xl p-2 transition hover:bg-muted/40">
                            {/* Profile: opens the driver's profile */}
                            <Link
                                href={`/drivers/${d.id}`}
                                className="flex items-center gap-3 rounded-lg transition hover:opacity-80"
                            >
                                <Avatar className="size-10">
                                    <AvatarFallback className="bg-ocean text-white">
                                        {initials(d.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate font-medium">
                                    {d.name}
                                </span>
                            </Link>
                            {/* Published ride: goes straight to reserve it */}
                            {d.next_ride ? (
                                <Link
                                    href={`/rides/${d.next_ride.id}/book`}
                                    className="mt-1.5 block rounded-lg bg-muted/50 px-3 py-1.5 text-xs transition hover:bg-ocean/15"
                                >
                                    <span className="block truncate font-medium">
                                        {d.next_ride.route}
                                    </span>
                                    <span className="block truncate text-muted-foreground">
                                        {fmtDateTime(d.next_ride.departure_at)} ·{' '}
                                        <span className="font-semibold text-ocean dark:text-foam">
                                            Reserve →
                                        </span>
                                    </span>
                                </Link>
                            ) : (
                                <p className="mt-1.5 px-3 text-xs text-muted-foreground">
                                    No route published
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
