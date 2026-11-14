// Driver dashboard card: passengers asking for a seat, newest first. Opens the booking to approve or decline.
import { Link } from '@inertiajs/react';
import { fmtDateTime } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export type PassengerRequest = {
    id: number;
    passenger: string;
    route: string;
    departure_at: string;
    seats: number;
};

export default function PassengerRequestsCard({
    requests,
    total,
}: {
    requests: PassengerRequest[];
    /** All pending requests (the list shows only the newest few). */
    total: number;
}) {
    const initials = useInitials();

    return (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                    Passenger requests
                    {total > 0 && (
                        <span className="ml-2 rounded-full bg-coral px-2 py-0.5 text-xs font-semibold text-white">
                            {total}
                        </span>
                    )}
                </h2>
                <Link
                    href="/bookings?tab=requests"
                    className="text-sm font-medium text-ocean hover:underline dark:text-foam"
                >
                    View all →
                </Link>
            </div>

            {requests.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                    No passengers are waiting for your answer.
                </p>
            ) : (
                <ul className="mt-3 space-y-1">
                    {requests.map((r) => (
                        <li key={r.id}>
                            <Link
                                href={`/bookings/${r.id}`}
                                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/40"
                            >
                                <Avatar className="size-10">
                                    <AvatarFallback className="bg-ocean text-white">
                                        {initials(r.passenger)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium">
                                        {r.passenger}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {r.route} · {r.seats}{' '}
                                        {r.seats === 1 ? 'seat' : 'seats'}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {fmtDateTime(r.departure_at)}
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
