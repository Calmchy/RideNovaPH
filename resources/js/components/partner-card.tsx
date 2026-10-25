// "Your driver" / "Your passenger" profile card, shown on the booking page.
// The server (App\Support\PartnerProfile) decides what is safe to show; this file only displays it.
import { BadgeCheck, Car, Luggage, Phone, ShieldQuestion } from 'lucide-react';
import { fmtDate, Stars } from '@/components/lux';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export type Partner = {
    role: 'driver' | 'passenger';
    name: string;
    member_since: string | null;
    id_verified: boolean;
    rating: { average: number | null; total: number };
    trips_completed: number;
    phone: string | null;
    bio: string | null;
    allows_luggage: boolean | null;
    vehicle: {
        name: string;
        color: string;
        plate_number: string;
        seats: number;
        year: number | null;
    } | null;
    recent_reviews: { rating: number; comment: string; at: string | null }[];
};

export default function PartnerCard({ partner: p }: { partner: Partner }) {
    const initials = useInitials();

    return (
        <section
            aria-label={`Your ${p.role}`}
            className="rounded-2xl border bg-card shadow-sm"
        >
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
                <h2 className="font-semibold">
                    Your {p.role === 'driver' ? 'driver' : 'passenger'}
                </h2>
                {p.id_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-foam/60 px-2.5 py-0.5 text-xs font-medium text-deep">
                        <BadgeCheck className="size-3.5" /> ID verified
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        <ShieldQuestion className="size-3.5" /> ID not verified
                    </span>
                )}
            </div>

            <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr]">
                {/* Identity */}
                <div className="flex items-center gap-4 md:flex-col md:items-start">
                    <Avatar className="size-16">
                        <AvatarFallback className="bg-ocean text-lg font-semibold text-white">
                            {initials(p.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-lg font-semibold">{p.name}</p>
                        {p.member_since && (
                            <p className="text-xs text-muted-foreground">
                                Member since {fmtDate(p.member_since)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid gap-4">
                    {/* Reputation */}
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <div>
                            <dt className="text-muted-foreground">Rating</dt>
                            <dd className="font-medium">
                                {p.rating.average !== null ? (
                                    <>
                                        <Stars
                                            value={Math.round(p.rating.average)}
                                        />{' '}
                                        {p.rating.average.toFixed(1)}{' '}
                                        <span className="text-xs text-muted-foreground">
                                            ({p.rating.total})
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">
                                        No reviews yet
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">
                                Trips completed
                            </dt>
                            <dd className="font-medium">
                                {p.trips_completed}
                            </dd>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <dt className="text-muted-foreground">Contact</dt>
                            <dd className="font-medium">
                                {p.phone ? (
                                    <a
                                        href={`tel:${p.phone}`}
                                        className="inline-flex items-center gap-1 text-ocean hover:underline"
                                    >
                                        <Phone className="size-3.5" />
                                        {p.phone}
                                    </a>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        Shown once the booking is approved
                                    </span>
                                )}
                            </dd>
                        </div>
                    </dl>

                    {/* Driver-only: bio, luggage policy, this trip's vehicle */}
                    {p.bio && (
                        <p className="rounded-xl bg-muted/50 p-3 text-sm">
                            “{p.bio}”
                        </p>
                    )}
                    {p.vehicle && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                            <span className="inline-flex items-center gap-1.5">
                                <Car className="size-4 text-ocean" />
                                {p.vehicle.name} · {p.vehicle.color}
                                {p.vehicle.year ? ` · ${p.vehicle.year}` : ''}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                {p.vehicle.plate_number}
                            </span>
                            <span className="text-muted-foreground">
                                {p.vehicle.seats} seats
                            </span>
                            {p.allows_luggage !== null && (
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <Luggage className="size-4" />
                                    {p.allows_luggage
                                        ? 'Luggage allowed'
                                        : 'No luggage'}
                                </span>
                            )}
                        </div>
                    )}

                    {/* What others said (React escapes the text, so comments can't inject HTML) */}
                    {p.recent_reviews.length > 0 && (
                        <div className="grid gap-2">
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Recent reviews
                            </h3>
                            {p.recent_reviews.map((r, i) => (
                                <blockquote
                                    key={i}
                                    className="rounded-xl border p-3 text-sm"
                                >
                                    <Stars value={r.rating} />
                                    <p className="mt-1">{r.comment}</p>
                                    {r.at && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {fmtDate(r.at)}
                                        </p>
                                    )}
                                </blockquote>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
