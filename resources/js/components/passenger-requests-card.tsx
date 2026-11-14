// Driver dashboard card: ONLY what passengers are asking of me right now, newest first:
//  - seat requests for my rides, and
//  - requests to hire my whole vehicle.
// Each row opens that request, where the driver accepts or declines.
import { Link } from '@inertiajs/react';
import { fmtDateTime } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export type PassengerRequests = {
    /** Everything waiting for an answer (the list shows only the newest few). */
    total: number;
    items: {
        key: string;
        kind: 'seat' | 'hire';
        passenger: string;
        detail: string;
        when: string;
        href: string;
    }[];
};

const KIND = {
    seat: 'Seat request',
    hire: 'Hire request',
} as const;

export default function PassengerRequestsCard({
    data,
}: {
    data: PassengerRequests;
}) {
    const initials = useInitials();

    return (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">
                Passenger requests
                {data.total > 0 && (
                    <span className="ml-2 rounded-full bg-coral px-2 py-0.5 text-xs font-semibold text-white">
                        {data.total}
                    </span>
                )}
            </h2>

            {data.items.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                    No passengers are waiting for your answer.
                </p>
            ) : (
                <ul className="mt-3 space-y-1">
                    {data.items.map((r) => (
                        <li key={r.key}>
                            <Link
                                href={r.href}
                                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/40"
                            >
                                <Avatar className="size-10">
                                    <AvatarFallback className="bg-ocean text-white">
                                        {initials(r.passenger)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span className="truncate text-sm font-medium">
                                            {r.passenger}
                                        </span>
                                        <span className="shrink-0 rounded-full bg-sand/60 px-2 py-0.5 text-[10px] font-semibold text-deep">
                                            {KIND[r.kind]}
                                        </span>
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {r.detail}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {fmtDateTime(r.when)}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm font-medium text-ocean dark:text-foam">
                <Link href="/driver/rides" className="hover:underline">
                    Seat requests →
                </Link>
                <Link href="/driver/hire" className="hover:underline">
                    Hire requests →
                </Link>
            </div>
        </section>
    );
}
