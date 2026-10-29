// Public "Customer ratings & reviews": average + star-level bars (click a bar to filter) + latest reviews.
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Stars } from '@/components/lux';
import ReviewCard from '@/components/review-card';

export type PublicReview = {
    id: number;
    rating: number;
    comment: string | null;
    reviewer: string;
    at: string | null;
};

export type RatingSummary = {
    average: number | null;
    total: number;
    distribution: { stars: number; count: number; percent: number }[];
};

/** Big average + "5 stars ▇▇▇ 83% (n)" rows. `baseHref` makes each row a filter link. */
export function RatingSummaryBars({
    summary,
    baseHref,
    active,
}: {
    summary: RatingSummary;
    baseHref?: string;
    active?: number | null;
}) {
    return (
        <div>
            <div className="flex items-center gap-3">
                <p className="text-3xl font-bold">
                    {summary.average !== null
                        ? summary.average.toFixed(1)
                        : '–'}
                    <span className="text-base font-normal text-muted-foreground">
                        {' '}
                        out of 5
                    </span>
                </p>
                {summary.average !== null && (
                    <Stars value={Math.round(summary.average)} />
                )}
            </div>
            <p className="text-sm text-muted-foreground">
                {summary.total} {summary.total === 1 ? 'rating' : 'ratings'}
            </p>

            <ul className="mt-4 space-y-2">
                {summary.distribution.map((d) => {
                    const row = (
                        <>
                            <span className="w-14 shrink-0 text-sm underline-offset-2 group-hover:underline">
                                {d.stars} star{d.stars > 1 && 's'}
                            </span>
                            <span className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                <span
                                    className="block h-full rounded-full bg-ocean"
                                    style={{ width: `${d.percent}%` }}
                                />
                            </span>
                            <span className="w-24 shrink-0 text-right text-sm text-muted-foreground">
                                {d.percent}% ({d.count})
                            </span>
                        </>
                    );

                    return (
                        <li key={d.stars}>
                            {baseHref ? (
                                <Link
                                    href={`${baseHref}?stars=${d.stars}`}
                                    className={`group flex items-center gap-3 rounded-md px-1 ${active === d.stars ? 'bg-foam/40' : ''}`}
                                >
                                    {row}
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3 px-1">
                                    {row}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
    return (
        <ul className="divide-y">
            {reviews.map((r) => (
                <li key={r.id} className="py-3">
                    <ReviewCard
                        name={r.reviewer}
                        rating={r.rating}
                        comment={r.comment}
                        at={r.at}
                    />
                </li>
            ))}
        </ul>
    );
}

export default function ReviewsPanel({
    reviews,
    summary,
    historyHref,
    action,
}: {
    reviews: PublicReview[];
    summary: RatingSummary;
    historyHref: string;
    /** Optional button shown top-right (e.g. "Write a Review"). */
    action?: ReactNode;
}) {
    return (
        <section
            aria-label="Customer ratings and reviews"
            className="rounded-2xl border bg-card p-5 shadow-sm"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl">
                    Customer ratings &amp; reviews
                </h2>
                {action}
            </div>

            <RatingSummaryBars summary={summary} baseHref={historyHref} />

            {reviews.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">
                    No reviews yet. Passengers can review after a completed
                    trip.
                </p>
            ) : (
                <>
                    <div className="mt-5 border-t pt-2">
                        <ReviewList reviews={reviews} />
                    </div>
                    <Link
                        href={historyHref}
                        className="mt-2 inline-block text-sm font-medium text-ocean hover:underline dark:text-foam"
                    >
                        See review history ({summary.total}) →
                    </Link>
                </>
            )}
        </section>
    );
}
