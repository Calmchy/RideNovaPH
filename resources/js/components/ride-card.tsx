import { Link } from '@inertiajs/react';
import { CalendarClock, MapPin, Phone, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fmtDateTime, LIFT_3D, peso } from '@/components/lux';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

/** "just now", "3h ago", "2d ago", or the date once it is over a week old. */
const timeAgo = (iso: string) => {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

    if (mins < 1) {
        return 'just now';
    }

    if (mins < 60) {
        return `${mins}m ago`;
    }

    if (mins < 1440) {
        return `${Math.floor(mins / 60)}h ago`;
    }

    return mins < 10080
        ? `${Math.floor(mins / 1440)}d ago`
        : new Date(iso).toLocaleDateString('en-PH', { dateStyle: 'medium' });
};
/** How long a closed ride stays on the Find a ride list. */
const CLOSED_VISIBLE_MS = 2 * 60 * 1000;
const isNewlyPublished = (iso: string) => Date.now() - new Date(iso).getTime() < 86400000;

export type RideCardData = {
    id: number;
    origin: string;
    destination: string;
    pickup_point: string;
    departure_at: string;
    price_per_seat: string;
    seats_left: number;
    vehicle: string;
    driver_name: string;
    event?: string | null;
    /** scheduled | on_the_road | completed | cancelled */
    trip_status?: string;
    closed_at?: string | null;
    /** When the driver published it. */
    published_at?: string | null;
    /** Only sent on signed-in pages (Find a ride): the driver's profile, photo and phone number. */
    driver_id?: number;
    driver_photo?: string | null;
    driver_phone?: string | null;
};

/** One ride. The title area opens the details page; the button goes straight to Review & Reserve. */
export default function RideCard({ ride }: { ride: RideCardData }) {
    const initials = useInitials();
    const hasDriver = ride.driver_id !== undefined;
    // The trip already left: shown in red, and hovering the button says why.
    const closed = !!ride.trip_status && ride.trip_status !== 'scheduled';
    const closedLabel = ride.trip_status === 'completed' ? 'Arrived' : ride.trip_status === 'cancelled' ? 'Cancelled' : 'On The Road';
    // Closed rides count down and vanish 2 minutes after they closed.
    const expiresAt = closed && ride.closed_at ? new Date(ride.closed_at).getTime() + CLOSED_VISIBLE_MS : null;
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (expiresAt === null) {
            return;
        }

        const t = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(t);
    }, [expiresAt]);

    const msLeft = expiresAt === null ? null : expiresAt - now;

    if (msLeft !== null && msLeft <= 0) {
        return null;
    }

    const onRoad = closed;
    const isNew = !!ride.published_at && isNewlyPublished(ride.published_at);

    return (
        <div
            className={`group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm ${LIFT_3D} ${onRoad ? 'border-red-400/60 bg-red-500/5' : ''}`}
        >
           <Link href={`/rides/${ride.id}`} className="flex flex-1 flex-col space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl">
                        {ride.origin} <span className="text-coral">→</span>{' '}
                        {ride.destination}
                    </h3>
                    <span className="shrink-0 rounded-full bg-sand/60 px-3 py-1 text-sm font-semibold text-deep dark:text-sand">
                        {peso(ride.price_per_seat)}
                    </span>
                </div>
                    
                {ride.event && (
                    <p className="inline-block rounded-full bg-foam/60 px-3 py-0.5 text-xs font-medium text-deep">
                        {ride.event}
                    </p>
                )}
                {ride.published_at && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isNew && (
                            <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-deep">
                                NEW
                            </span>
                        )}
                        Published {timeAgo(ride.published_at)}
                    </p>
                )}
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                        <CalendarClock className="size-4 text-ocean" />
                        {fmtDateTime(ride.departure_at)}
                    </li>
                    <li className="flex items-center gap-2">
                        <MapPin className="size-4 text-ocean" />
                        {ride.pickup_point}
                    </li>
                    <li className="flex items-center gap-2">
                        <Users className="size-4 text-ocean" />
                        {ride.seats_left}{' '}
                        {ride.seats_left === 1 ? 'seat' : 'seats'} left
                        {!hasDriver && <> · {ride.driver_name}</>}
                    </li>
                </ul>
            </Link>
            {hasDriver && (
                // Outside the card link above: links can't be nested inside links.
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                    <Avatar className="size-11">
                        {ride.driver_photo && (
                            <AvatarImage
                                src={ride.driver_photo}
                                alt={`Photo of ${ride.driver_name}`}
                            />
                        )}
                        <AvatarFallback>{initials(ride.driver_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-sm">
                        <Link
                            href={`/drivers/${ride.driver_id}`}
                            className="block truncate font-medium text-ocean hover:underline dark:text-foam"
                        >
                            {ride.driver_name}
                        </Link>
                        {ride.driver_phone ? (
                            <a
                                href={`tel:${ride.driver_phone.replace(/\s+/g, '')}`}
                                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                                <Phone className="size-3.5" />
                                {ride.driver_phone}
                            </a>
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                No contact number
                            </span>
                        )}
                    </div>
                </div>
            )}
            <div className="mt-auto flex gap-2">
                <Link
                    href={`/rides/${ride.id}`}
                    className="flex-1 rounded-lg border px-3 py-2 text-center text-sm hover:bg-muted"
                >
                    Details
                </Link>
                {onRoad ? (
                    <div
                        tabIndex={0}
                        title={closedLabel}
                        className="group/closed relative flex-1 cursor-not-allowed select-none overflow-hidden rounded-lg border border-red-500/60 bg-red-100 px-3 py-2 text-center text-sm font-medium text-red-700 hover:bg-red-200 focus:bg-red-200 focus:outline-none dark:border-red-400/60 dark:bg-red-500/20 dark:text-red-200 dark:hover:bg-red-500/30 dark:focus:bg-red-500/30"
                    >
                        <span className="block transition duration-200 group-hover/closed:-translate-y-full group-hover/closed:opacity-0 group-focus/closed:-translate-y-full group-focus/closed:opacity-0">
                            No longer open
                        </span>
                        <span className="absolute inset-0 flex translate-y-full items-center justify-center gap-2 font-bold text-red-800 opacity-0 dark:text-white transition duration-200 group-hover/closed:translate-y-0 group-hover/closed:opacity-100 group-focus/closed:translate-y-0 group-focus/closed:opacity-100">
                            <span className="relative flex size-2.5">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 dark:bg-red-300" />
                                <span className="relative inline-flex size-2.5 rounded-full bg-red-500 dark:bg-red-300" />
                            </span>
                            {closedLabel}
                        </span>
                    </div>
                ) : (
                    <Link
                        href={`/rides/${ride.id}/book`}
                        className="flex-1 rounded-lg bg-ocean px-3 py-2 text-center text-sm font-medium text-white hover:brightness-110"
                    >
                        Reserve
                    </Link>
                )}
            </div>
        </div>
    );
}
