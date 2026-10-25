import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export type Banner = {
    id: number;
    title: string;
    caption: string | null;
    link_url: string | null;
    image_url: string;
};

// Shown only until an admin uploads real photos (Admin > Banners). Pure CSS gradients,
// so the page never depends on remote images.
const FALLBACK = [
    {
        id: -1,
        title: 'Palawan',
        caption:
            'Lagoons, limestone cliffs and the clearest water in the country.',
        link_url: '/bookings?tab=find',
        g: 'from-deep via-ocean to-deep',
    },
    {
        id: -2,
        title: 'Siargao',
        caption: 'Island hopping, surf and sunsets at Cloud 9.',
        link_url: '/bookings?tab=find',
        g: 'from-ocean via-deep to-deep',
    },
    {
        id: -3,
        title: 'Banaue',
        caption: 'The Rice Terraces: 2,000 years of mountain farming.',
        link_url: '/bookings?tab=find',
        g: 'from-deep via-ocean/70 to-deep',
    },
    {
        id: -4,
        title: 'Bohol',
        caption: 'Chocolate Hills, tarsiers and quiet white beaches.',
        link_url: '/bookings?tab=find',
        g: 'from-deep via-coral/40 to-deep',
    },
];

export default function BannerSlideshow({ banners }: { banners: Banner[] }) {
    const slides = banners.length
        ? banners.map((b) => ({ ...b, g: '' }))
        : FALLBACK.map((f) => ({ ...f, image_url: '' }));

    const [i, setI] = useState(0);
    const [paused, setPaused] = useState(false);
    const go = (n: number) => setI((n + slides.length) % slides.length);

    // Auto-advance every 6s; stops on hover/focus and for users who prefer reduced motion.
    useEffect(() => {
        const reduce = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (paused || reduce || slides.length < 2) {
            return;
        }

        const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000);

        return () => clearInterval(t);
    }, [paused, slides.length, i]);

    return (
        <section
            className="relative h-[78vh] min-h-[560px] w-full overflow-hidden bg-deep"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-roledescription="carousel"
            aria-label="Philippine destinations"
        >
            {slides.map((s, idx) => (
                <div
                    key={s.id}
                    aria-hidden={idx !== i}
                    className={`absolute inset-0 transition-opacity duration-1000 ${idx === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                >
                    {s.image_url ? (
                        <img
                            src={s.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div
                            className={`h-full w-full bg-gradient-to-br ${s.g}`}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/30 to-deep/50" />
                    <div className="absolute bottom-40 left-6 max-w-xl md:left-16">
                        <p className="text-xs tracking-[0.3em] text-sand uppercase">
                            Discover the Philippines
                        </p>
                        <h2 className="mt-3 font-serif text-5xl text-white md:text-7xl">
                            {s.title}
                        </h2>
                        {s.caption && (
                            <p className="mt-4 text-lg text-white/80">
                                {s.caption}
                            </p>
                        )}
                        {s.link_url && (
                            <Link
                                href={s.link_url}
                                tabIndex={idx === i ? 0 : -1}
                                className="mt-6 inline-block rounded-full border border-sand/60 px-6 py-2.5 text-sm text-sand transition hover:bg-sand hover:text-deep"
                            >
                                See rides →
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            {slides.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => go(i - 1)}
                        aria-label="Previous slide"
                        className="absolute top-1/3 left-3 rounded-full bg-black/30 p-2 text-white backdrop-blur transition hover:bg-black/60"
                    >
                        <ChevronLeft className="size-6" />
                    </button>
                    <button
                        type="button"
                        onClick={() => go(i + 1)}
                        aria-label="Next slide"
                        className="absolute top-1/3 right-3 rounded-full bg-black/30 p-2 text-white backdrop-blur transition hover:bg-black/60"
                    >
                        <ChevronRight className="size-6" />
                    </button>
                    <div
                        className="absolute bottom-28 left-6 flex gap-2 md:left-16"
                        role="tablist"
                    >
                        {slides.map((s, idx) => (
                            <button
                                key={s.id}
                                type="button"
                                role="tab"
                                aria-selected={idx === i}
                                aria-label={`Show slide ${idx + 1}`}
                                onClick={() => setI(idx)}
                                className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-10 bg-sand' : 'w-4 bg-white/40 hover:bg-white/70'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
