// "My review history": what others wrote about me, and what I wrote.
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { EmptyState, PageHeader } from '@/components/kit';
import { fmtDate, Stars } from '@/components/lux';
import { cn } from '@/lib/utils';

type Item = {
    id: number;
    rating: number;
    comment: string | null;
    at: string | null;
    trip: string;
    booking_id: number;
    who: string;
};

export default function ReviewHistory({
    about_me,
    by_me,
}: {
    about_me: Item[];
    by_me: Item[];
}) {
    const [tab, setTab] = useState<'about' | 'by'>('about');
    const items = tab === 'about' ? about_me : by_me;

    return (
        <>
            <Head title="Review history" />
            <div className="space-y-6 p-4 md:p-8">
                <PageHeader
                    title="Review history"
                    description="Everything said about you, and what you've written."
                />

                <div className="flex gap-2">
                    {(
                        [
                            ['about', `About me (${about_me.length})`],
                            ['by', `Written by me (${by_me.length})`],
                        ] as const
                    ).map(([k, label]) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() => setTab(k)}
                            className={cn(
                                'rounded-full border px-4 py-1.5 text-sm font-medium',
                                tab === k
                                    ? 'bg-ocean text-white'
                                    : 'hover:bg-muted',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {items.length === 0 ? (
                    <EmptyState>No reviews here yet.</EmptyState>
                ) : (
                    <ul className="space-y-3">
                        {items.map((r) => (
                            <li
                                key={r.id}
                                className="rounded-2xl border bg-card p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span className="font-medium">
                                        {tab === 'about'
                                            ? r.who
                                            : `To ${r.who}`}{' '}
                                        <span className="font-normal text-muted-foreground">
                                            · {r.trip}
                                        </span>
                                    </span>
                                    {r.at && (
                                        <span className="text-xs text-muted-foreground">
                                            {fmtDate(r.at)}
                                        </span>
                                    )}
                                </div>
                                <Stars value={r.rating} />
                                {r.comment && (
                                    <p className="mt-1 text-sm whitespace-pre-line">
                                        {r.comment}
                                    </p>
                                )}
                                <Link
                                    href={`/bookings/${r.booking_id}`}
                                    className="mt-2 inline-block text-xs text-ocean hover:underline dark:text-foam"
                                >
                                    View booking
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
