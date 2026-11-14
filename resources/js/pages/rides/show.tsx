// Public ride details. Guests can look; reserving needs an account and (by default) an approved ID.
import { Head, Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { fmtDateTime, peso } from '@/components/lux';
import ReviewsPanel from '@/components/reviews-panel';
import type { PublicReview, RatingSummary } from '@/components/reviews-panel';
import SiteHeader from '@/components/site-header';

type Props = {
    ride: {
        id: number;
        origin: string;
        destination: string;
        pickup_point: string;
        dropoff_point: string | null;
        departure_at: string;
        price_per_seat: string;
        seats_left: number;
        vehicle: string;
        driver_name: string;
        notes: string | null;
        status: string;
        trip_status: string;
    };
    driver_rating: { average: number | null; total: number };
    reviews: PublicReview[];
    rating_summary: RatingSummary;
    driver_id: number;
    my_booking_id: number | null;
    can_book: boolean;
    has_approved_id: boolean;
};

export default function RideShow({
    ride,
    driver_rating,
    reviews,
    rating_summary,
    driver_id,
    my_booking_id,
    can_book,
    has_approved_id,
}: Props) {
    const { auth } = usePage().props;
    const cta =
        'block w-full rounded-xl px-6 py-3.5 text-center font-semibold transition';
    const primary = `${cta} bg-coral text-deep hover:brightness-110`;
    const open =
        ride.status === 'open' &&
        ride.trip_status === 'scheduled' &&
        ride.seats_left > 0;

    // Why the ride is closed, shown when the passenger hovers the red button.
    const closedHover =
        ({
            on_the_road: 'On The Road',
            completed: 'Trip completed',
            cancelled: 'Ride cancelled',
        } as Record<string, string>)[ride.trip_status] ??
        (ride.status !== 'open' ? 'Ride closed' : null);

    return (
        <>
            <Head title={`${ride.origin} to ${ride.destination}`} />
            <div className="min-h-screen bg-background">
                <SiteHeader solid />
                <main className="mx-auto max-w-5xl px-5 py-10">
                    <Link
                        href="/bookings?tab=find"
                        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" /> All rides
                    </Link>

                    <div className="grid gap-8 md:grid-cols-[1fr_340px]">
                        <section className="space-y-6">
                            <h1 className="font-serif text-4xl md:text-5xl">
                                {ride.origin}{' '}
                                <span className="text-coral">→</span>{' '}
                                {ride.destination}
                            </h1>
                            <dl className="grid gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:grid-cols-2">
                                {[
                                    [
                                        'Departure',
                                        fmtDateTime(ride.departure_at),
                                    ],
                                    ['Pick-up point', ride.pickup_point],
                                    [
                                        'Drop-off point',
                                        ride.dropoff_point ??
                                            'To be agreed with the driver',
                                    ],
                                    ['Vehicle', ride.vehicle],
                                    ['Driver', ride.driver_name],
                                    [
                                        'Driver rating',
                                        driver_rating.average
                                            ? `★ ${driver_rating.average} (${driver_rating.total} reviews)`
                                            : 'No reviews yet',
                                    ],
                                ].map(([k, v]) => (
                                    <div key={k}>
                                        <dt className="text-xs tracking-widest text-ocean uppercase dark:text-foam">
                                            {k}
                                        </dt>
                                        <dd className="mt-1">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                            {ride.notes && (
                                <p className="rounded-2xl border bg-card p-5 whitespace-pre-line text-muted-foreground">
                                    {ride.notes}
                                </p>
                            )}
                            <ReviewsPanel
                                reviews={reviews}
                                summary={rating_summary}
                                historyHref={`/drivers/${driver_id}/reviews`}
                            />
                        </section>

                        <aside className="h-fit space-y-4 rounded-3xl bg-deep p-6 text-white shadow-lg">
                            <p className="font-serif text-4xl text-sand">
                                {peso(ride.price_per_seat)}
                                <span className="text-base text-foam/70">
                                    {' '}
                                    / seat
                                </span>
                            </p>
                            <p className="text-sm text-foam/80">
                                {ride.seats_left} seats left · cash on the ride
                            </p>

                            {my_booking_id ? (
                                <Link
                                    href={`/bookings/${my_booking_id}`}
                                    className={`${cta} bg-white/10 hover:bg-white/20`}
                                >
                                    View my booking
                                </Link>
                            ) : !open ? (
                                <div
                                    tabIndex={0}
                                    title={closedHover ?? undefined}
                                    className={`${cta} group relative cursor-not-allowed select-none overflow-hidden border border-red-400/60 bg-red-500/20 text-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.15)] hover:bg-red-500/30 focus:bg-red-500/30 focus:outline-none`}
                                >
                                    <span
                                        className={`block transition duration-200 ${closedHover ? 'group-hover:-translate-y-full group-hover:opacity-0 group-focus:-translate-y-full group-focus:opacity-0' : ''}`}
                                    >
                                        {ride.seats_left < 1
                                            ? 'Fully booked'
                                            : 'No longer open'}
                                    </span>
                                    {closedHover && (
                                        <span className="absolute inset-0 flex translate-y-full items-center justify-center gap-2 font-bold text-white opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100">
                                            {ride.trip_status ===
                                                'on_the_road' && (
                                                <span className="relative flex size-2.5">
                                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-300 opacity-75" />
                                                    <span className="relative inline-flex size-2.5 rounded-full bg-red-300" />
                                                </span>
                                            )}
                                            {closedHover}
                                        </span>
                                    )}
                                </div>
                            ) : !auth.user ? (
                                <Link href="/login" className={primary}>
                                    Log in to reserve
                                </Link>
                            ) : !has_approved_id && !can_book ? (
                                <Link href="/identity" className={primary}>
                                    Verify your ID to book
                                </Link>
                            ) : can_book ? (
                                <Link
                                    href={`/rides/${ride.id}/book`}
                                    className={primary}
                                >
                                    Reserve a seat
                                </Link>
                            ) : (
                                <p className="text-sm text-foam/80">
                                    This is your own ride.
                                </p>
                            )}
                        </aside>
                    </div>
                </main>
            </div>
        </>
    );
}
