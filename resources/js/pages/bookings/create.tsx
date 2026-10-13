// "Review & Reserve": contact details, pick-up / return places with a live map, price summary.
// Everything is validated again on the server (StoreBookingRequest + ReserveSeat).
import { Head, Link, useForm } from '@inertiajs/react';
import { Crosshair, MapPin, Search } from 'lucide-react';
import { useState } from 'react';
import { Field, inputCls, Panel } from '@/components/kit';
import { fmtDateTime, peso, toLocalInput } from '@/components/lux';
import TripMap from '@/components/trip-map';
import type { PinKind } from '@/components/trip-map';
import { Button } from '@/components/ui/button';
import { currentPosition, reverseGeocode, searchPlace } from '@/lib/geo';
import type { LatLng } from '@/lib/geo';
import { cn } from '@/lib/utils';

type Props = {
    ride: {
        id: number;
        origin: string;
        destination: string;
        pickup_point: string;
        departure_at: string;
        price_per_seat: string;
        seats_left: number;
        vehicle: string;
        driver_name: string;
        origin_coords: LatLng | null;
        destination_coords: LatLng | null;
    };
    prefill: {
        contact_name: string;
        contact_email: string;
        contact_phone: string | null;
        contact_address: string | null;
    };
    max_seats: number;
    cutoff_hours: number;
};

export default function BookingCreate({
    ride,
    prefill,
    max_seats,
    cutoff_hours,
}: Props) {
    const [active, setActive] = useState<PinKind | null>('pickup');
    const [live, setLive] = useState(false);
    const [roundTrip, setRoundTrip] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const form = useForm({
        seats: 1,
        contact_name: prefill.contact_name,
        contact_email: prefill.contact_email,
        contact_phone: prefill.contact_phone ?? '',
        contact_address: prefill.contact_address ?? '',
        pickup_location: ride.pickup_point,
        pickup_lat: ride.origin_coords?.lat ?? ('' as number | ''),
        pickup_lng: ride.origin_coords?.lng ?? ('' as number | ''),
        pickup_at: toLocalInput(new Date(ride.departure_at)),
        return_location: '',
        return_lat: '' as number | '',
        return_lng: '' as number | '',
        return_at: '',
        agree: false,
    });
    const d = form.data;
    // Business-rule errors from ReserveSeat arrive under keys that are not form fields.
    const errors = form.errors as Record<string, string | undefined>;
    const total = Number(ride.price_per_seat) * d.seats;

    const point = (lat: number | '', lng: number | ''): LatLng | null =>
        lat === '' || lng === '' ? null : { lat, lng };
    const pickup = point(d.pickup_lat, d.pickup_lng);
    const dropoff = roundTrip ? point(d.return_lat, d.return_lng) : null;

    /** Put a pin on the map for pick-up or return, and (optionally) its readable address. */
    const setPin = (kind: PinKind, p: LatLng, label?: string | null) => {
        form.setData((prev) => ({
            ...prev,
            ...(kind === 'pickup'
                ? {
                      pickup_lat: p.lat,
                      pickup_lng: p.lng,
                      ...(label ? { pickup_location: label } : {}),
                  }
                : {
                      return_lat: p.lat,
                      return_lng: p.lng,
                      ...(label ? { return_location: label } : {}),
                  }),
        }));
    };

    // Map click / drag: set the pin immediately, then fill in the address when Nominatim answers.
    const onPick = (kind: PinKind, p: LatLng) => {
        setPin(kind, p);
        reverseGeocode(p)
            .then((label) => label && setPin(kind, p, label))
            .catch(() => undefined);
    };

    const search = async (kind: PinKind) => {
        const text = kind === 'pickup' ? d.pickup_location : d.return_location;
        setMsg(null);
        const hit = text.trim()
            ? await searchPlace(`${text}, ${ride.origin}`).catch(() => null)
            : null;

        if (hit) {
            setPin(kind, hit, hit.label);
        } else {
            setMsg(
                'We could not find that place. Click the map to drop a pin instead.',
            );
        }
    };

    const locateMe = async (kind: PinKind) => {
        setMsg(null);

        try {
            const p = await currentPosition();
            setPin(kind, p);
            reverseGeocode(p)
                .then((label) => label && setPin(kind, p, label))
                .catch(() => undefined);
        } catch (e) {
            setMsg((e as Error).message);
        }
    };

    const location = (
        kind: PinKind,
        label: string,
        key: 'pickup_location' | 'return_location',
    ) => (
        <div className="grid gap-2">
            <Field label={label} error={form.errors[key]}>
                <input
                    value={d[key]}
                    maxLength={255}
                    onChange={(e) => form.setData(key, e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            search(kind);
                        }
                    }}
                    placeholder="Type a place, then Search, or click the map"
                    className={inputCls}
                />
            </Field>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => search(kind)}
                >
                    <Search /> Search
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => locateMe(kind)}
                >
                    <Crosshair /> Use my location
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={active === kind ? 'default' : 'outline'}
                    onClick={() => setActive(kind)}
                >
                    <MapPin /> Pin on map
                </Button>
            </div>
        </div>
    );

    return (
        <>
            <Head title="Review & Reserve" />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    // A one-way trip sends no return details at all.
                    form.transform((data) =>
                        roundTrip
                            ? data
                            : {
                                  ...data,
                                  return_location: '',
                                  return_lat: '',
                                  return_lng: '',
                                  return_at: '',
                              },
                    );
                    form.post(`/rides/${ride.id}/book`);
                }}
                className="mx-auto grid w-full max-w-6xl gap-8 p-4 md:p-8 lg:grid-cols-[1fr_22rem]"
            >
                <div className="space-y-6">
                    <div>
                        <Link
                            href="/bookings?tab=find"
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            ← Back to rides
                        </Link>
                        <h1 className="mt-2 font-serif text-3xl md:text-4xl">
                            Review &amp; Reserve
                        </h1>
                        <ol
                            className="mt-3 flex gap-2 text-xs text-muted-foreground"
                            aria-label="Steps"
                        >
                            <li className="rounded-full bg-ocean px-3 py-1 font-medium text-white">
                                1 · Details
                            </li>
                            <li className="rounded-full bg-muted px-3 py-1">
                                2 · Wait for driver
                            </li>
                            <li className="rounded-full bg-muted px-3 py-1">
                                3 · Confirm &amp; ride
                            </li>
                        </ol>
                    </div>

                    <Panel title="Your trip">
                        <div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                            <p className="font-serif text-xl sm:col-span-2">
                                {ride.origin}{' '}
                                <span className="text-coral">→</span>{' '}
                                {ride.destination}
                            </p>
                            <p>
                                <span className="text-muted-foreground">
                                    Departs{' '}
                                </span>
                                {fmtDateTime(ride.departure_at)}
                            </p>
                            <p>
                                <span className="text-muted-foreground">
                                    Driver{' '}
                                </span>
                                {ride.driver_name}
                            </p>
                            <p>
                                <span className="text-muted-foreground">
                                    Vehicle{' '}
                                </span>
                                {ride.vehicle}
                            </p>
                            <p>
                                <span className="text-muted-foreground">
                                    Meeting point{' '}
                                </span>
                                {ride.pickup_point}
                            </p>
                        </div>
                    </Panel>

                    <Panel title="Contact details">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Full name"
                                error={form.errors.contact_name}
                            >
                                <input
                                    required
                                    value={d.contact_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_name',
                                            e.target.value,
                                        )
                                    }
                                    autoComplete="name"
                                    className={inputCls}
                                />
                            </Field>
                            <Field
                                label="Email"
                                error={form.errors.contact_email}
                            >
                                <input
                                    required
                                    type="email"
                                    value={d.contact_email}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_email',
                                            e.target.value,
                                        )
                                    }
                                    autoComplete="email"
                                    className={inputCls}
                                />
                            </Field>
                            <Field
                                label="Mobile number"
                                error={form.errors.contact_phone}
                                hint="Philippine mobile, e.g. 09171234567"
                            >
                                <input
                                    required
                                    inputMode="tel"
                                    value={d.contact_phone}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_phone',
                                            e.target.value,
                                        )
                                    }
                                    autoComplete="tel"
                                    className={inputCls}
                                />
                            </Field>
                            <Field
                                label="Home address"
                                error={form.errors.contact_address}
                            >
                                <input
                                    required
                                    value={d.contact_address}
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_address',
                                            e.target.value,
                                        )
                                    }
                                    autoComplete="street-address"
                                    className={inputCls}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Pick-up &amp; return">
                        <div className="space-y-5 p-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {location(
                                    'pickup',
                                    'Pick-up location',
                                    'pickup_location',
                                )}
                                <Field
                                    label="Pick-up date & time"
                                    error={form.errors.pickup_at}
                                >
                                    <input
                                        required
                                        type="datetime-local"
                                        value={d.pickup_at}
                                        min={toLocalInput(new Date())}
                                        onChange={(e) =>
                                            form.setData(
                                                'pickup_at',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                </Field>
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={roundTrip}
                                    onChange={(e) => {
                                        setRoundTrip(e.target.checked);
                                        setActive(
                                            e.target.checked
                                                ? 'return'
                                                : 'pickup',
                                        );
                                    }}
                                />
                                I also need a return trip
                            </label>

                            {roundTrip && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {location(
                                        'return',
                                        'Return location',
                                        'return_location',
                                    )}
                                    <Field
                                        label="Return date & time"
                                        error={form.errors.return_at}
                                    >
                                        <input
                                            type="datetime-local"
                                            value={d.return_at}
                                            min={d.pickup_at}
                                            onChange={(e) =>
                                                form.setData(
                                                    'return_at',
                                                    e.target.value,
                                                )
                                            }
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>
                            )}

                            {msg && (
                                <p
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {msg}
                                </p>
                            )}

                            <TripMap
                                center={ride.origin_coords}
                                pickup={pickup}
                                dropoff={dropoff}
                                active={
                                    active === 'return' && !roundTrip
                                        ? 'pickup'
                                        : active
                                }
                                onPick={onPick}
                                live={live}
                                className="h-80 w-full rounded-xl border"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <p>
                                    Click the map to place the{' '}
                                    <strong
                                        className={cn(
                                            active === 'return'
                                                ? 'text-coral-ink'
                                                : 'text-ocean',
                                        )}
                                    >
                                        {active === 'return'
                                            ? 'return'
                                            : 'pick-up'}
                                    </strong>{' '}
                                    pin. Drag a pin to fine-tune it.
                                </p>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={live}
                                        onChange={(e) =>
                                            setLive(e.target.checked)
                                        }
                                    />
                                    Show my live GPS position
                                </label>
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* Order summary: sticky on desktop */}
                <aside className="h-fit space-y-4 rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-6">
                    <h2 className="font-semibold">Price summary</h2>
                    <Field label="Seats" error={form.errors.seats}>
                        <select
                            value={d.seats}
                            onChange={(e) =>
                                form.setData('seats', Number(e.target.value))
                            }
                            className={inputCls}
                        >
                            {Array.from(
                                { length: Math.max(max_seats, 1) },
                                (_, n) => n + 1,
                            ).map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">
                                Rate per seat
                            </dt>
                            <dd>{peso(ride.price_per_seat)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Seats</dt>
                            <dd>× {d.seats}</dd>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-base font-semibold">
                            <dt>Total</dt>
                            <dd>{peso(total)}</dd>
                        </div>
                    </dl>
                    <p className="rounded-lg bg-foam/40 p-3 text-xs text-deep dark:bg-foam/10 dark:text-foam">
                        Pay the driver in cash on the ride. No payment is taken
                        now. A reference number is created when you reserve.
                    </p>
                    <label className="flex items-start gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={d.agree}
                            onChange={(e) =>
                                form.setData('agree', e.target.checked)
                            }
                            className="mt-0.5"
                        />
                        <span>
                            I agree to pay in cash on the ride and understand I
                            can’t cancel within {cutoff_hours} hour(s) of
                            departure.
                        </span>
                    </label>
                    {form.errors.agree && (
                        <p className="text-xs text-destructive">
                            {form.errors.agree}
                        </p>
                    )}
                    {(errors.ride || errors.id || errors.seats) && (
                        <p className="text-sm text-destructive" role="alert">
                            {errors.ride ?? errors.id}
                        </p>
                    )}
                    <Button
                        type="submit"
                        disabled={form.processing}
                        className="w-full"
                        size="lg"
                    >
                        {form.processing
                            ? 'Reserving…'
                            : `Reserve seat · ${peso(total)}`}
                    </Button>
                </aside>
            </form>
        </>
    );
}
