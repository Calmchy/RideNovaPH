// Ride publishing. The server re-checks that the vehicle is yours and the seats fit.
import { Head, Link, useForm } from '@inertiajs/react';
import { Field, inputCls, PageHeader, Panel } from '@/components/kit';
import { peso, toLocalInput } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    vehicles: { id: number; label: string; seat_capacity: number }[];
    cities: { id: number; name: string }[];
    announcements: { id: number; title: string }[];
};

export default function CreateRide({ vehicles, cities, announcements }: Props) {
    const form = useForm({
        vehicle_id: String(vehicles[0]?.id ?? ''),
        origin_city_id: '',
        destination_city_id: '',
        pickup_point: '',
        dropoff_point: '',
        departure_at: '',
        seats_offered: String(Math.min(vehicles[0]?.seat_capacity ?? 4, 4)),
        price_per_seat: '',
        notes: '',
        announcement_id: '',
    });
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
            <Head title="Publish a ride" />
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <PageHeader
                    title="Publish a ride"
                    description="Passengers will see this in Bookings → Find a ride."
                />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/driver/rides');
                    }}
                    className="space-y-6"
                >
                    <Panel title="Route">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="From"
                                error={form.errors.origin_city_id}
                            >
                                <select required {...f('origin_city_id')}>
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
                                <select required {...f('destination_city_id')}>
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
                                    min={toLocalInput(new Date())}
                                    {...f('departure_at')}
                                />
                            </Field>
                            {announcements.length > 0 && (
                                <Field
                                    label="For an exam / event (optional)"
                                    error={form.errors.announcement_id}
                                >
                                    <select {...f('announcement_id')}>
                                        <option value="">None</option>
                                        {announcements.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.title}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                        </div>
                    </Panel>
                    <Panel title="Vehicle, seats &amp; price">
                        <div className="grid gap-4 p-5 sm:grid-cols-3">
                            <Field
                                label="Vehicle"
                                error={form.errors.vehicle_id}
                            >
                                <select required {...f('vehicle_id')}>
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
                                    min={1}
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
                                    min={0}
                                    step="0.01"
                                    {...f('price_per_seat')}
                                />
                            </Field>
                            <div className="sm:col-span-3">
                                <Field
                                    label="Notes for passengers (optional)"
                                    error={form.errors.notes}
                                >
                                    <textarea
                                        rows={2}
                                        maxLength={255}
                                        placeholder="Leaves on time. Small bags only."
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
                            {form.processing ? 'Publishing…' : 'Publish ride'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/driver/rides">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
