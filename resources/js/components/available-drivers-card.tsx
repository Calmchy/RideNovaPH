// Dashboard card: a few verified drivers (alphabetical, never ranked) and the route they're on.
// Clicking a driver opens their profile; "View all" opens the full directory.
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
                        <li key={d.id}>
                            <Link
                                href={`/drivers/${d.id}`}
                                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/60"
                            >
                                <Avatar className="size-10">
                                    <AvatarFallback className="bg-ocean text-white">
                                        {initials(d.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0">
                                    <span className="block truncate font-medium">
                                        {d.name}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {d.next_ride
                                            ? `${d.next_ride.route} · ${fmtDateTime(d.next_ride.departure_at)}`
                                            : 'No route published'}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
