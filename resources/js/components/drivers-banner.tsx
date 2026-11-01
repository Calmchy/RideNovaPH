// "Available drivers" banner: a swipeable strip of driver cards that also auto-advances.
// Each card shows rating, vehicles, the driver's contact number and a "Request" button.
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Phone, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LIFT_3D, peso } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';

export type HireDriver = {
    id: number;
    name: string;
    phone: string | null;
    bio: string | null;
    rating: number | null;
    reviews: number;
    can_hire: boolean;
    /** Vehicles this driver lets people rent without the driver (renter drives). */
    rentals: { id: number; name: string; daily_rate: string }[];
    vehicles: { name: string; color: string; seats: number }[];
};

export default function DriversBanner({ drivers }: { drivers: HireDriver[] }) {
    const initials = useInitials();
    const strip = useRef<HTMLDivElement>(null);
    const [paused, setPaused] = useState(false);

    /** Scroll by one card width (wraps back to the start at the end). */
    const slide = (dir: 1 | -1) => {
        const el = strip.current;

        if (!el) {
            return;
        }

        const step = el.clientWidth * 0.8;
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;

        if (dir === 1 && atEnd) {
            el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            el.scrollBy({ left: dir * step, behavior: 'smooth' });
        }
    };

    // Auto-advance every 5 s; paused on hover/focus and for "reduce motion" users.
    useEffect(() => {
        const reduce = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (paused || reduce || drivers.length < 2) {
            return;
        }

        const t = setInterval(() => slide(1), 5000);

        return () => clearInterval(t);
    }, [paused, drivers.length]);

    return (
        <section
            aria-label="Available drivers"
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div
                ref={strip}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {drivers.map((d) => (
                    <article
                        key={d.id}
                        className={`flex w-[85%] shrink-0 snap-start flex-col gap-3 rounded-2xl border bg-card p-5 sm:w-[46%] lg:w-[31%] ${LIFT_3D}`}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar className="size-12">
                                <AvatarFallback className="bg-ocean font-semibold text-white">
                                    {initials(d.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <h3 className="truncate font-serif text-lg">
                                    {d.name}
                                </h3>
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Star className="size-3.5 fill-sand text-sand" />
                                    {d.rating !== null
                                        ? `${d.rating.toFixed(1)} (${d.reviews})`
                                        : 'No reviews yet'}
                                </p>
                            </div>
                        </div>

                        {d.bio && (
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                                “{d.bio}”
                            </p>
                        )}

                        <ul className="flex flex-wrap gap-1.5 text-xs">
                            {d.vehicles.map((v, i) => (
                                <li
                                    key={i}
                                    className="rounded-full bg-foam/60 px-2.5 py-0.5 font-medium text-deep"
                                >
                                    {v.name} · {v.color} · {v.seats} seats
                                </li>
                            ))}
                        </ul>

                        {d.phone ? (
                            <a
                                href={`tel:${d.phone}`}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-ocean hover:underline"
                            >
                                <Phone className="size-4" /> {d.phone}
                            </a>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                No contact number yet. Use the chat after you
                                send a request.
                            </p>
                        )}

                        <div className="mt-auto grid gap-2">
                            {d.can_hire && (
                                <Button asChild>
                                    <Link href={`/charters/new?driver=${d.id}`}>
                                        Request this driver
                                    </Link>
                                </Button>
                            )}
                            {d.rentals.slice(0, 2).map((r) => (
                                <Button key={r.id} asChild variant="outline">
                                    <Link href={`/rentals/new?vehicle=${r.id}`}>
                                        Rent {r.name} only · {peso(r.daily_rate)}
                                        /day
                                    </Link>
                                </Button>
                            ))}
                            {d.rentals.length > 0 && (
                                <p className="text-center text-xs text-muted-foreground">
                                    “Rent only” = you drive, without the driver.
                                </p>
                            )}
                        </div>
                    </article>
                ))}
            </div>

            {drivers.length > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous drivers"
                        onClick={() => slide(-1)}
                        className="absolute top-1/2 -left-3 hidden -translate-y-1/2 rounded-full border bg-card p-2 shadow md:block"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next drivers"
                        onClick={() => slide(1)}
                        className="absolute top-1/2 -right-3 hidden -translate-y-1/2 rounded-full border bg-card p-2 shadow md:block"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                </>
            )}
        </section>
    );
}
