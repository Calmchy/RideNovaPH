// Auto-playing, clickable slideshow of admin banners and upcoming exam/event announcements.
// Plays every 6 s, pauses on hover/focus, respects "reduce motion", and has dots + arrows.
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type Slide = {
    key: string;
    tag: string;
    title: string;
    caption: string | null;
    image_url: string | null;
    href: string;
};

// Shown only until an admin adds banners/announcements. Palette gradients, no remote images needed.
const FALLBACK: Slide[] = [
    {
        key: 'f1',
        tag: 'Welcome',
        title: 'Share the ride, split the fare',
        caption: 'Verified drivers and passengers across Eastern Visayas.',
        image_url: null,
        href: '/bookings?tab=find',
    },
    {
        key: 'f2',
        tag: 'Exams',
        title: 'Heading to an LPT, CSE or TESDA exam?',
        caption: 'Find a seat to the exam city and arrive rested.',
        image_url: null,
        href: '/bookings?tab=find',
    },
    {
        key: 'f3',
        tag: 'Vacation',
        title: 'Weekend getaway?',
        caption: 'Book a seat to your next beach, mountain or hometown trip.',
        image_url: null,
        href: '/bookings?tab=find',
    },
];

const GRADIENTS = [
    'from-deep via-ocean/80 to-deep',
    'from-ocean via-deep to-deep',
    'from-deep via-deep to-ocean/70',
];

export default function DashboardSlideshow({ slides }: { slides: Slide[] }) {
    const items = slides.length ? slides : FALLBACK;
    const [i, setI] = useState(0);
    const [paused, setPaused] = useState(false);
    const go = (n: number) => setI((n + items.length) % items.length);

    useEffect(() => {
        const reduce = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (paused || reduce || items.length < 2) {
            return;
        }

        const t = setInterval(() => setI((n) => (n + 1) % items.length), 6000);

        return () => clearInterval(t);
    }, [paused, items.length]);

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Featured rides and events"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            className="relative overflow-hidden rounded-2xl bg-deep text-white shadow-sm"
        >
            <div
                className="flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${i * 100}%)` }}
            >
                {items.map((s, n) => (
                    <Link
                        key={s.key}
                        href={s.href}
                        tabIndex={n === i ? 0 : -1}
                        aria-hidden={n !== i}
                        className={cn(
                            'relative block min-h-48 w-full shrink-0 bg-gradient-to-br p-6 md:min-h-56 md:p-8',
                            GRADIENTS[n % GRADIENTS.length],
                        )}
                        style={
                            s.image_url
                                ? {
                                      backgroundImage: `linear-gradient(90deg, rgba(6,42,53,.85), rgba(6,42,53,.25)), url(${s.image_url})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                  }
                                : undefined
                        }
                    >
                        <span className="inline-block rounded-full bg-sand px-3 py-1 text-xs font-semibold text-deep">
                            {s.tag}
                        </span>
                        <h2 className="mt-3 max-w-xl font-serif text-2xl md:text-3xl">
                            {s.title}
                        </h2>
                        {s.caption && (
                            <p className="mt-2 max-w-lg text-sm text-foam">
                                {s.caption}
                            </p>
                        )}
                        <span className="mt-4 inline-block text-sm font-medium text-sand">
                            Find rides →
                        </span>
                    </Link>
                ))}
            </div>

            {items.length > 1 && (
                <>
                    <button
                        onClick={() => go(i - 1)}
                        aria-label="Previous slide"
                        className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-deep/60 p-1.5 hover:bg-deep"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        onClick={() => go(i + 1)}
                        aria-label="Next slide"
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-deep/60 p-1.5 hover:bg-deep"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                        {items.map((s, n) => (
                            <button
                                key={s.key}
                                onClick={() => setI(n)}
                                aria-label={`Go to slide ${n + 1}`}
                                className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    n === i
                                        ? 'w-6 bg-sand'
                                        : 'w-1.5 bg-white/50',
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
