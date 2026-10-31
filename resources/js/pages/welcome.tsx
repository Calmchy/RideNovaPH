import { Head, Link } from '@inertiajs/react';
import {
    BadgeCheck,
    CalendarCheck,
    CalendarClock,
    Car,
    MapPinned,
    Search,
    Star,
} from 'lucide-react';
import BannerSlideshow from '@/components/banner-slideshow';
import type { Banner } from '@/components/banner-slideshow';
import CursorTrail from '@/components/cursor-trail';
import { HOLO, HoloStyles } from '@/components/holo-card';
import { fmtDate } from '@/components/lux';
import RideCard from '@/components/ride-card';
import type { RideCardData } from '@/components/ride-card';
import SiteHeader from '@/components/site-header';

type Announcement = {
    id: number;
    title: string;
    category: string;
    city: string | null;
    city_id: number | null;
    exam_date: string | null;
    image_url: string | null;
};

type Props = {
    banners: Banner[];
    cities: { id: number; name: string }[];
    rides: RideCardData[];
    announcements: Announcement[];
};

const STEPS = [
    {
        icon: BadgeCheck,
        title: 'Verify your ID',
        text: 'Upload a valid ID once. An admin checks it so everyone on board is accountable.',
    },
    {
        icon: Search,
        title: 'Find a ride',
        text: 'Search by origin, destination and date inside Bookings, then reserve your seats.',
    },
    {
        icon: CalendarCheck,
        title: 'Driver approves',
        text: 'The driver accepts your request and you confirm. You get a reference number.',
    },
    {
        icon: Star,
        title: 'Ride and review',
        text: 'Pay cash on the ride, get a receipt, then rate each other to keep the community trusted.',
    },
];

export default function Welcome({ banners, rides, announcements }: Props) {
    return (
        <>
            <Head title="Affordable shared rides across the Philippines" />
            <CursorTrail />
            <HoloStyles />
            <div className="min-h-screen bg-background text-foreground">
                <SiteHeader />
                <BannerSlideshow banners={banners} />

                <main className="mx-auto max-w-7xl space-y-24 px-5 py-20">
                    <section>
                        <div className="mb-8 flex items-end justify-between">
                            <h2 className="font-serif text-4xl">
                                Upcoming rides
                            </h2>
                            <Link
                                href="/bookings?tab=find"
                                className="text-sm text-ocean hover:underline dark:text-foam"
                            >
                                Browse in Bookings →
                            </Link>
                        </div>
                        {rides.length ? (
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {rides.map((r) => (
                                    <RideCard key={r.id} ride={r} />
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                                No rides posted yet. Be the first driver to
                                offer seats.
                            </p>
                        )}
                    </section>

                    {announcements.length > 0 && (
                        <section>
                            <h2 className="mb-8 font-serif text-4xl">
                                Exam schedules and notices
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {announcements.map((a) => (
                                    <Link
                                        key={a.id}
                                        href={
                                            a.city_id
                                                ? `/bookings?tab=find&destination=${a.city_id}`
                                                : '/bookings?tab=find'
                                        }
                                        className="group relative overflow-hidden rounded-2xl border bg-card transition-[transform,box-shadow] duration-300 ease-out hover:z-10 hover:scale-105 hover:shadow-2xl hover:shadow-black/40 motion-reduce:transition-none motion-reduce:hover:transform-none"
                                    >
                                        {a.image_url && (
                                            <div className="relative h-40 overflow-hidden bg-deep">
                                                <img
                                                    src={a.image_url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110 group-hover:opacity-40 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
                                                />
                                                {/* Revealed on hover: where to go, and when */}
                                                <div className="absolute inset-0 flex translate-y-2 items-start justify-between p-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-deep shadow">
                                                        <MapPinned className="size-4 text-coral-ink" />
                                                        {a.city_id
                                                            ? 'Find rides'
                                                            : 'View notice'}
                                                    </span>
                                                    {a.exam_date && (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-deep shadow">
                                                            <CalendarClock className="size-4 text-ocean" />
                                                            {fmtDate(
                                                                a.exam_date,
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <p className="text-xs tracking-widest text-coral-ink uppercase">
                                                {a.category}
                                            </p>
                                            <p className="mt-1 text-lg">
                                                {a.title}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {[
                                                    a.city,
                                                    a.exam_date &&
                                                        fmtDate(a.exam_date),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                                {a.city_id &&
                                                    ' · Find rides to this city →'}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 className="mb-10 text-center font-serif text-4xl">
                            How RideNovaPH works
                        </h2>
                        <div className="grid gap-6 md:grid-cols-4">
                            {STEPS.map(({ icon: Icon, title, text }, n) => (
                                <div
                                    key={title}
                                    className={`rounded-2xl border bg-card p-6 ${HOLO}`}
                                >
                                    <Icon className="size-8 text-ocean" />
                                    <p className="mt-4 text-xs text-muted-foreground">
                                        STEP {n + 1}
                                    </p>
                                    <h3 className="mt-1 font-serif text-xl">
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {text}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-12 text-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3 font-semibold text-deep transition hover:brightness-110"
                            >
                                <Car className="size-5" /> Join RideNovaPH
                            </Link>
                        </div>
                    </section>
                </main>

                <footer className="bg-deep py-8 text-center text-sm text-foam/70">
                    © {new Date().getFullYear()} RideNovaPH · Cash on ride ·
                    Your ID is stored privately and viewed only by admins.
                </footer>
            </div>
        </>
    );
}
