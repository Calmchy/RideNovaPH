import { Link } from '@inertiajs/react';
import { CalendarClock, MapPin, Phone, Users } from 'lucide-react';
import { fmtDateTime, LIFT_3D, peso } from '@/components/lux';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

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
    /** Only sent on signed-in pages (Find a ride): the driver's profile, photo and phone number. */
    driver_id?: number;
    driver_photo?: string | null;
    driver_phone?: string | null;
};

/** One ride. The title area opens the details page; the button goes straight to Review & Reserve. */
export default function RideCard({ ride }: { ride: RideCardData }) {
    const initials = useInitials();
    const hasDriver = ride.driver_id !== undefined;

    return (
        <div className={`group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm ${LIFT_3D}`}>
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
                <Link
                    href={`/rides/${ride.id}/book`}
                    className="flex-1 rounded-lg bg-ocean px-3 py-2 text-center text-sm font-medium text-white hover:brightness-110"
                >
                    Reserve
                </Link>
            </div>
        </div>
    );
}
