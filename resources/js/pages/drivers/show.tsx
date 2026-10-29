// One driver's public profile: verified badge, bio, vehicles, reviews and their open routes.
import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, Luggage } from 'lucide-react';
import { PageHeader, Panel } from '@/components/kit';
import { fmtDateTime, peso } from '@/components/lux';
import ReviewsPanel from '@/components/reviews-panel';
import type { PublicReview, RatingSummary } from '@/components/reviews-panel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';

type Props = {
    driver: {
        id: number;
        name: string;
        member_since: string | null;
        bio: string | null;
        allows_luggage: boolean;
        available_for_hire: boolean;
        rating: number | null;
        reviews: number;
        trips_completed: number;
        vehicles: { name: string; color: string; seats: number }[];
        recent_reviews: PublicReview[];
    };
    summary: RatingSummary;
    upcoming: {
        id: number;
        route: string;
        departure_at: string;
        price_per_seat: string;
    }[];
    is_me: boolean;
};

export default function DriverShow({
    driver: d,
    summary,
    upcoming,
    is_me,
}: Props) {
    const initials = useInitials();

    return (
        <>
            <Head title={d.name} />
            <div className="space-y-6 p-4 md:p-8">
                <PageHeader
                    title={d.name}
                    description="Driver profile"
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/drivers">← All drivers</Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-3">
                    <Panel title="About">
                        <div className="flex items-center gap-4">
                            <Avatar className="size-16">
                                <AvatarFallback className="bg-ocean text-lg font-semibold text-white">
                                    {initials(d.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="inline-flex items-center gap-1 rounded-full bg-foam/60 px-2.5 py-0.5 text-xs font-medium text-deep">
                                    <BadgeCheck className="size-3.5" /> Verified
                                    driver
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {d.rating !== null
                                        ? `★ ${d.rating.toFixed(1)} (${d.reviews} reviews)`
                                        : 'No reviews yet'}
                                    {' · '}
                                    {d.trips_completed} trips
                                </p>
                            </div>
                        </div>
                        {d.bio && (
                            <p className="mt-4 text-sm">“{d.bio}”</p>
                        )}
                        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Luggage className="size-4" />
                            {d.allows_luggage
                                ? 'Luggage allowed'
                                : 'No large luggage'}
                        </p>
                        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
                            {d.vehicles.map((v, i) => (
                                <li
                                    key={i}
                                    className="rounded-full bg-foam/60 px-2.5 py-0.5 font-medium text-deep"
                                >
                                    {v.name} · {v.color} · {v.seats} seats
                                </li>
                            ))}
                        </ul>
                        {!is_me && d.available_for_hire && (
                            <Button asChild className="mt-4 w-full">
                                <Link href={`/charters/new?driver=${d.id}`}>
                                    Hire this driver for a group
                                </Link>
                            </Button>
                        )}
                    </Panel>

                    <div className="space-y-6 lg:col-span-2">
                        <Panel title="Current routes">
                            {upcoming.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No route published right now.
                                </p>
                            ) : (
                                <ul className="divide-y">
                                    {upcoming.map((r) => (
                                        <li key={r.id}>
                                            <Link
                                                href={`/rides/${r.id}`}
                                                className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-ocean"
                                            >
                                                <span>
                                                    <span className="font-medium">
                                                        {r.route}
                                                    </span>
                                                    <span className="block text-sm text-muted-foreground">
                                                        {fmtDateTime(
                                                            r.departure_at,
                                                        )}
                                                    </span>
                                                </span>
                                                <span className="text-sm font-semibold">
                                                    {peso(r.price_per_seat)} /
                                                    seat
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <ReviewsPanel
                            reviews={d.recent_reviews}
                            summary={summary}
                            historyHref={`/drivers/${d.id}/reviews`}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
