// Public review history of one driver: rating bars (click to filter) + every review, 10 per page.
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { RatingSummaryBars, ReviewList } from '@/components/reviews-panel';
import type { PublicReview, RatingSummary } from '@/components/reviews-panel';
import SiteHeader from '@/components/site-header';

type Props = {
    driver: { id: number; name: string };
    summary: RatingSummary;
    reviews: {
        data: PublicReview[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    stars: number | null;
};

export default function DriverReviews({
    driver,
    summary,
    reviews,
    stars,
}: Props) {
    const base = `/drivers/${driver.id}/reviews`;

    return (
        <>
            <Head title={`Reviews for ${driver.name}`} />
            <div className="min-h-screen bg-background">
                <SiteHeader solid />
                <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
                    <Link
                        href="/drivers"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" /> Drivers
                    </Link>
                    <h1 className="font-serif text-3xl">
                        Review history · {driver.name}
                    </h1>

                    <section className="rounded-2xl border bg-card p-5 shadow-sm">
                        <RatingSummaryBars
                            summary={summary}
                            baseHref={base}
                            active={stars}
                        />
                        {stars && (
                            <Link
                                href={base}
                                className="mt-3 inline-block text-sm text-ocean hover:underline dark:text-foam"
                            >
                                Clear filter ({stars}-star only)
                            </Link>
                        )}
                    </section>

                    <section className="rounded-2xl border bg-card p-5 shadow-sm">
                        {reviews.data.length ? (
                            <ReviewList reviews={reviews.data} />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No reviews here yet.
                            </p>
                        )}

                        {reviews.links.length > 3 && (
                            <nav className="mt-4 flex flex-wrap gap-1">
                                {reviews.links.map((l, i) =>
                                    l.url ? (
                                        <Link
                                            key={i}
                                            href={l.url}
                                            preserveScroll
                                            className={`rounded-md border px-3 py-1 text-sm ${l.active ? 'bg-ocean text-white' : 'hover:bg-muted'}`}
                                            dangerouslySetInnerHTML={{
                                                __html: l.label,
                                            }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="rounded-md border px-3 py-1 text-sm text-muted-foreground/50"
                                            dangerouslySetInnerHTML={{
                                                __html: l.label,
                                            }}
                                        />
                                    ),
                                )}
                            </nav>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}
