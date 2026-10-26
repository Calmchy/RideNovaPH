// Publish a ride, or edit one you already published (same form, pre-filled).
// The server re-checks that the vehicle is yours, the seats fit, and which fields are locked.
import { Head, Link, useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { Field, inputCls, PageHeader, Panel } from '@/components/kit';
import { peso, toLocalInput } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    vehicles: { id: number; label: string; seat_capacity: number }[];
    cities: { id: number; name: string }[];
    announcements: { id: number; title: string }[];
    /** Present when EDITING an existing ride. */
    ride: {
        id: number;
        vehicle_id: string;
        origin_city_id: string;
        destination_city_id: string;
        pickup_point: string;
        dropoff_point: string;
        departure_at: string;
        seats_offered: string;
        price_per_seat: string;
        notes: string;
        announcement_id: string;
        event_name: string;
        seats_booked: number;
    } | null;
    /** True once passengers have booked: route, pick-up, time, price and vehicle are frozen. */
    locked: boolean;
};

export default function CreateRide({
    vehicles,
    cities,
    announcements,
    ride,
    locked,
}: Props) {
    const editing = ride !== null;
    const form = useForm({
        vehicle_id: ride?.vehicle_id ?? String(vehicles[0]?.id ?? ''),
        origin_city_id: ride?.origin_city_id ?? '',
        destination_city_id: ride?.destination_city_id ?? '',
        pickup_point: ride?.pickup_point ?? '',
        dropoff_point: ride?.dropoff_point ?? '',
        departure_at: ride?.departure_at ?? '',
        seats_offered:
            ride?.seats_offered ??
            String(Math.min(vehicles[0]?.seat_capacity ?? 4, 4)),
        price_per_seat: ride?.price_per_seat ?? '',
        notes: ride?.notes ?? '',
        announcement_id: ride?.announcement_id ?? '',
        event_name: ride?.event_name ?? '',
    });
    // "Edit" lets the driver type their own event instead of picking one from the list.
    const [ownEvent, setOwnEvent] = useState(Boolean(ride?.event_name));
    const vehicle = vehicles.find((v) => String(v.id) === form.data.vehicle_id);
    const f = (k: keyof typeof form.data) => ({
        value: form.data[k],
        onChange: (
            e: React.ChangeEvent<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >,
        ) => form.setData(k, e.target.value),
        className: inputCls,
    });
    const earn =
        Number(form.data.price_per_seat || 0) *
        Number(form.data.seats_offered || 0);

    return (
        <>
            <Head title={editing ? 'Edit ride' : 'Publish a ride'} />
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <PageHeader
                    title={editing ? 'Edit ride' : 'Publish a ride'}
                    description="Passengers will see this in Bookings → Find a ride."
                />
                {locked && (
                    <p className="rounded-xl border border-sand/60 bg-sand/20 p-4 text-sm">
                        Passengers have already booked this ride, so the route,
                        pick-up point, departure time, price and vehicle are
                        locked. You can still change the description, drop-off
                        point, event and seats (not below the{' '}
                        {ride?.seats_booked} already booked). To change the
                        rest, cancel this ride and publish a new one.
                    </p>
                )}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();

                        if (editing) {
                            form.patch(`/driver/rides/${ride.id}`);
                        } else {
                            form.post('/driver/rides');
                        }
                    }}
                    className="space-y-6"
                >
                    <Panel title="Route">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="From"
                                error={form.errors.origin_city_id}
                            >
                                <select
                                    required
                                    disabled={locked}
                                    {...f('origin_city_id')}
                                >
                                    <option value="">Choose…</option>
                                    {cities.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="To"
                                error={form.errors.destination_city_id}
                            >
                                <select
                                    required
                                    disabled={locked}
                                    {...f('destination_city_id')}
                                >
                                    <option value="">Choose…</option>
                                    {cities.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="Pick-up point"
                                error={form.errors.pickup_point}
                            >
                                <input
                                    required
                                    disabled={locked}
                                    maxLength={150}
                                    placeholder="e.g. Abuyog public market"
                                    {...f('pickup_point')}
                                />
                            </Field>
                            <Field
                                label="Drop-off point (optional)"
                                error={form.errors.dropoff_point}
                            >
                                <input
                                    maxLength={150}
                                    {...f('dropoff_point')}
                                />
                            </Field>
                            <Field
                                label="Departure"
                                error={form.errors.departure_at}
                            >
                                <input
                                    required
                                    type="datetime-local"
                                    disabled={locked}
                                    min={
                                        editing
                                            ? undefined
                                            : toLocalInput(new Date())
                                    }
                                    {...f('departure_at')}
                                />
                            </Field>
                            <Field
                                label="For an event (optional)"
                                error={
                                    form.errors.event_name ??
                                    form.errors.announcement_id
                                }
                                hint={
                                    ownEvent
                                        ? 'Type the event name, e.g. "Brgy. Fiesta Trip".'
                                        : undefined
                                }
                            >
                                <div className="flex gap-2">
                                    {ownEvent ? (
                                        <input
                                            maxLength={120}
                                            placeholder="Your own event name"
                                            {...f('event_name')}
                                        />
                                    ) : (
                                        <select {...f('announcement_id')}>
                                            <option value="">None</option>
                                            {announcements.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.title}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="shrink-0"
                                        onClick={() => {
                                            // Switch modes and clear the other side so only one is sent.
                                            if (ownEvent) {
                                                form.setData('event_name', '');
                                            } else {
                                                form.setData(
                                                    'announcement_id',
                                                    '',
                                                );
                                            }

                                            setOwnEvent(!ownEvent);
                                        }}
                                    >
                                        <Pencil />
                                        {ownEvent ? 'Pick from list' : 'Edit'}
                                    </Button>
                                </div>
                            </Field>
                        </div>
                    </Panel>
                    <Panel title="Vehicle, seats &amp; price">
                        <div className="grid gap-4 p-5 sm:grid-cols-3">
                            <Field
                                label="Vehicle"
                                error={form.errors.vehicle_id}
                            >
                                <select
                                    required
                                    disabled={locked}
                                    {...f('vehicle_id')}
                                >
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="Seats offered"
                                error={form.errors.seats_offered}
                                hint={
                                    vehicle
                                        ? `Up to ${vehicle.seat_capacity}`
                                        : undefined
                                }
                            >
                                <input
                                    required
                                    type="number"
                                    min={Math.max(1, ride?.seats_booked ?? 1)}
                                    max={vehicle?.seat_capacity ?? 20}
                                    {...f('seats_offered')}
                                />
                            </Field>
                            <Field
                                label="Price per seat (₱)"
                                error={form.errors.price_per_seat}
                            >
                                <input
                                    required
                                    type="number"
                                    disabled={locked}
                                    min={0}
                                    step="0.01"
                                    {...f('price_per_seat')}
                                />
                            </Field>
                            <div className="sm:col-span-3">
                                <Field
                                    label="Trip description (optional)"
                                    error={form.errors.notes}
                                    hint={`${form.data.notes.length}/1000. Tell passengers what to expect: meeting spot details, stops, luggage, house rules.`}
                                >
                                    <textarea
                                        rows={4}
                                        maxLength={1000}
                                        placeholder="Leaves on time from the terminal. One small bag per person, no smoking."
                                        {...f('notes')}
                                    />
                                </Field>
                            </div>
                        </div>
                        {earn > 0 && (
                            <p className="border-t px-5 py-3 text-sm text-muted-foreground">
                                If all seats are booked the gross fare is{' '}
                                <strong className="text-foreground">
                                    {peso(earn)}
                                </strong>{' '}
                                (before the platform fee).
                            </p>
                        )}
                    </Panel>
                    <div className="flex gap-3">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Saving…'
                                : editing
                                  ? 'Save changes'
                                  : 'Publish ride'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link
                                href={
                                    editing
                                        ? `/driver/rides/${ride.id}`
                                        : '/driver/rides'
                                }
                            >
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
