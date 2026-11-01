// About RideNovaPH: who we are, what we offer, and how we bring value to passengers and drivers.
// Static content only (no user data), so it is safe for any signed-in visitor.
import { Head, Link } from '@inertiajs/react';
import {
    BadgeCheck,
    CalendarCheck,
    HandCoins,
    MapPinned,
    Navigation,
    Receipt,
    Route,
    ShieldCheck,
    Star,
    Users,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CursorTrail from '@/components/cursor-trail';
import GlowHero from '@/components/glow-hero';
import { HOLO, HoloStyles } from '@/components/holo-card';
import TeamCard from '@/components/team-card';
import type { TeamMember } from '@/components/team-card';
import { about } from '@/routes';

/** One small card: icon, title, text. Reused by every grid below so they all look the same. */
function Feature({
    icon: Icon,
    title,
    children,
}: {
    icon: LucideIcon;
    title: string;
    children: string;
}) {
    return (
        <div className={`rounded-2xl border bg-card p-6 ${HOLO}`}>
            <span className="grid size-11 place-items-center rounded-xl bg-ocean/10 text-ocean">
                <Icon className="size-6" />
            </span>
            <h3 className="mt-4 font-serif text-xl">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {children}
            </p>
        </div>
    );
}

function SectionTitle({
    eyebrow,
    title,
    text,
}: {
    eyebrow: string;
    title: string;
    text?: string;
}) {
    return (
        <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-ocean uppercase">
                {eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">
                {title}
            </h2>
            {text && (
                <p className="mt-3 leading-7 text-muted-foreground">{text}</p>
            )}
        </div>
    );
}

export default function About({ team = [] }: { team?: TeamMember[] }) {
    return (
        <>
            <Head title="About RideNovaPH" />
            <CursorTrail />
            <HoloStyles />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 p-4 md:p-8">
                {/* 1. WHO WE ARE */}
                <GlowHero>
                    <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[#0038a8]/45 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-[#ce1126]/30 blur-3xl" />
                    <div className="relative max-w-3xl">
                        <p className="text-xs font-semibold tracking-[0.25em] text-sand uppercase">
                            About RideNovaPH
                        </p>
                        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-white md:text-6xl">
                            Shared rides for every Filipino journey.
                        </h1>
                        <p className="mt-5 text-lg leading-8 text-white">
                            RideNovaPH is a carpooling platform that connects
                            passengers with verified drivers who are already
                            going their way: to a board exam, a government
                            test, a family trip or a weekend getaway. You split
                            the cost, the driver fills empty seats, and nobody
                            travels alone or overpays.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/bookings?tab=find"
                                className="rounded-full bg-coral px-7 py-3 font-semibold text-deep transition hover:brightness-110"
                            >
                                Find a ride
                            </Link>
                            <Link
                                href="/driver/rides/create"
                                className="rounded-full border border-sand/60 px-7 py-3 font-semibold text-sand transition hover:bg-sand hover:text-deep"
                            >
                                Offer seats as a driver
                            </Link>
                        </div>
                    </div>
                </GlowHero>

                {/* Mission */}
                <section className="grid gap-8 md:grid-cols-5">
                    <div className="md:col-span-3">
                        <SectionTitle
                            eyebrow="Our story"
                            title="Why we built it"
                        />
                        <div className="mt-4 space-y-4 leading-7 text-muted-foreground">
                            <p>
                                In Eastern Visayas and across the country,
                                getting to another city can mean long waits,
                                crowded terminals and fares that add up fast,
                                while many private vehicles make the same trip
                                with empty seats.
                            </p>
                            <p>
                                RideNovaPH puts those two sides together, with
                                the safeguards that make strangers comfortable
                                riding together: identity checks, clear rules,
                                receipts and live trip tracking.
                            </p>
                        </div>
                    </div>
                    <aside className={`rounded-2xl border bg-secondary p-6 md:col-span-2 ${HOLO}`}>
                        <h3 className="font-serif text-xl">Our mission</h3>
                        <p className="mt-3 leading-7">
                            Make shared travel in the Philippines{' '}
                            <strong>affordable, safe and trusted</strong> for
                            passengers and fairly paid for drivers.
                        </p>
                    </aside>
                </section>

                {/* 2. WHAT WE OFFER */}
                <section className="grid gap-8">
                    <SectionTitle
                        eyebrow="What we offer"
                        title="One platform, two sides of the road"
                        text="Whether you are looking for a seat or you have seats to share, everything happens in one Bookings area."
                    />
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className={`rounded-2xl border bg-card p-6 ${HOLO}`}>
                            <h3 className="font-serif text-2xl">
                                For passengers
                            </h3>
                            <ul className="mt-4 grid gap-3 text-sm leading-6">
                                {[
                                    'Search rides by origin, destination, date and price, then reserve seats in one short form.',
                                    'A reference number for every booking: your proof of reservation.',
                                    'See your driver’s profile, rating, vehicle and plate number before you ride.',
                                    'Follow your driver live on the map and get notified when they arrive.',
                                    'A printable receipt for every paid trip, and a review to leave afterwards.',
                                ].map((t) => (
                                    <li key={t} className="flex gap-3">
                                        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-ocean" />
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className={`rounded-2xl border bg-card p-6 ${HOLO}`}>
                            <h3 className="font-serif text-2xl">For drivers</h3>
                            <ul className="mt-4 grid gap-3 text-sm leading-6">
                                {[
                                    'Register your vehicles and publish rides with your own price per seat.',
                                    'Approve or decline requests, and see your passenger list and profiles.',
                                    'Start and finish trips with live status so passengers always know where you are.',
                                    'Mark a booking as paid with a slide-to-confirm button, and keep a record of every peso.',
                                    'Your earnings shown clearly in your transaction history.',
                                ].map((t) => (
                                    <li key={t} className="flex gap-3">
                                        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-ocean" />
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 3. HOW WE BRING VALUE */}
                <section className="grid gap-8">
                    <SectionTitle
                        eyebrow="Our value to you"
                        title="Why people choose RideNovaPH"
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Feature icon={Wallet} title="Affordable by design">
                            Split the cost of the trip. You see the full fare
                            up front, with no hidden charges, and pay in cash
                            on the ride.
                        </Feature>
                        <Feature icon={ShieldCheck} title="Verified people">
                            Every passenger and driver uploads a valid ID that
                            an admin reviews. Drivers also submit a licence.
                            Only approved accounts can book or publish rides.
                        </Feature>
                        <Feature icon={Navigation} title="Live trip tracking">
                            Passengers see the driver approaching, with
                            distance and estimated arrival, and get an alert
                            when the driver reaches the pick-up point.
                        </Feature>
                        <Feature icon={Receipt} title="Transparent records">
                            Reference numbers, status history and receipts for
                            every booking, so both sides can always check what
                            was agreed.
                        </Feature>
                        <Feature icon={HandCoins} title="Fair to drivers">
                            Drivers keep 100% of the fare. Cancelling after
                            payment is blocked to prevent no-shows and scams.
                        </Feature>
                        <Feature icon={Star} title="Trust through reviews">
                            After each trip, passengers and drivers rate each
                            other, so good behaviour is rewarded and visible.
                        </Feature>
                    </div>
                </section>

                {/* How it works */}
                <section className="grid gap-8">
                    <SectionTitle
                        eyebrow="How it works"
                        title="From sign-up to arrival in four steps"
                    />
                    <ol className="grid gap-6 md:grid-cols-4">
                        {[
                            [
                                Users,
                                'Join and verify',
                                'Create an account and upload a valid ID once.',
                            ],
                            [
                                Route,
                                'Find or publish',
                                'Passengers search rides; drivers publish theirs.',
                            ],
                            [
                                CalendarCheck,
                                'Reserve and confirm',
                                'The driver approves, you confirm, and you get a reference number.',
                            ],
                            [
                                MapPinned,
                                'Ride and review',
                                'Meet at the pick-up point, track the trip, pay, then rate each other.',
                            ],
                        ].map(([Icon, title, text], n) => {
                            const I = Icon as LucideIcon;

                            return (
                                <li
                                    key={title as string}
                                    className={`rounded-2xl border bg-card p-6 ${HOLO}`}
                                >
                                    <I className="size-8 text-ocean" />
                                    <p className="mt-4 text-xs text-muted-foreground">
                                        STEP {n + 1}
                                    </p>
                                    <h3 className="font-serif text-xl">
                                        {title as string}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {text as string}
                                    </p>
                                </li>
                            );
                        })}
                    </ol>
                </section>

                {/* The team */}
                {team.length > 0 && (
                    <section className="grid gap-8">
                        <SectionTitle
                            eyebrow="Our team"
                            title="The Team Behind RideNova PH"
                            text="The students who planned, built and tested RideNovaPH."
                        />
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {team.map((m) => (
                                <TeamCard key={m.id} m={m} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Who it is for */}
                <section className="rounded-3xl bg-secondary p-8 md:p-12">
                    <SectionTitle
                        eyebrow="Made for real trips"
                        title="Exams, vacations and everyday travel"
                        text="Heading to an LPT, Civil Service or TESDA assessment? Visiting family or a beach destination? Post the trip or join one, and arrive together."
                    />
                </section>

                {/* Call to action */}
                <section className="rounded-3xl bg-deep p-8 text-center text-foam md:p-12">
                    <h2 className="font-serif text-3xl text-white md:text-4xl">
                        Ready for your next ride?
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-foam/90">
                        Questions? Ask Nova, our chat assistant, in the corner
                        of any page.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link
                            href="/bookings?tab=find"
                            className="rounded-full bg-coral px-8 py-3 font-semibold text-deep transition hover:brightness-110"
                        >
                            Browse rides
                        </Link>
                        <Link
                            href="/identity"
                            className="rounded-full border border-sand/60 px-8 py-3 font-semibold text-sand transition hover:bg-sand hover:text-deep"
                        >
                            Verify my ID
                        </Link>
                    </div>
                </section>
            </div>
        </>
    );
}

About.layout = {
    breadcrumbs: [
        {
            title: 'About',
            href: about(),
        },
    ],
};
