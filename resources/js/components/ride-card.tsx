import { Link } from '@inertiajs/react';
import { CalendarClock, MapPin, Users } from 'lucide-react';
import { fmtDateTime, peso } from '@/components/lux';

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
};

/** One ride. The title area opens the details page; the button goes straight to Review & Reserve. */
export default function RideCard({ ride }: { ride: RideCardData }) {
    return (
        <div className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <Link href={`/rides/${ride.id}`} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl">
                        {ride.origin} <span className="text-coral">→</span>{' '}
                        {ride.destination}
                    </h3>
                    <span className="shrink-0 rounded-full bg-sand/60 px-3 py-1 text-sm font-semibold text-deep dark:text-sand">
                        {peso(ride.price_per_seat)}
                    </span>
                </div>
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
                        {ride.seats_left === 1 ? 'seat' : 'seats'} left ·{' '}
                        {ride.driver_name}
                    </li>
                </ul>
            </Link>
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
