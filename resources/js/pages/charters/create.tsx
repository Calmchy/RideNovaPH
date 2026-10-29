// The passenger's fill-out form to hire a driver for a group. The passenger sets the TERMS;
// the driver decides the PRICE after reading them, so there is no price field here.
import { Head, Link, useForm } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import { Field, inputCls, PageHeader, Panel } from '@/components/kit';
import { toLocalInput } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    driver: {
        id: number;
        name: string;
        phone: string | null;
        bio: string | null;
    };
    vehicles: { id: number; label: string; seats: number }[];
};

export default function CharterCreate({ driver, vehicles }: Props) {
    const form = useForm({
        driver_id: String(driver.id),
        vehicle_id: String(vehicles[0]?.id ?? ''),
        group_size: '2',
        pickup_location: '',
        dropoff_location: '',
        pickup_at: '',
        return_location: '',
        return_at: '',
        description: '',
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
    const now = toLocalInput(new Date());

    return (
        <>
            <Head title="Request a driver" />
            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
                <Link
                    href="/charters"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← Available drivers
                </Link>
                <PageHeader
                    title={`Request ${driver.name}`}
                    description="Fill in your trip. The driver reviews it and sends you a price. You only agree if the price suits you."
                    actions={
                        driver.phone ? (
                            <a
                                href={`tel:${driver.phone}`}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-ocean hover:underline"
                            >
                                <Phone className="size-4" />
                                {driver.phone}
                            </a>
                        ) : undefined
                    }
                />

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/charters');
                    }}
                    className="space-y-6"
                >
                    {form.errors.driver_id && (
                        <p
                            role="alert"
                            className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm"
                        >
                            {form.errors.driver_id}
                        </p>
                    )}

                    <Panel title="Group &amp; vehicle">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Vehicle *"
                                error={form.errors.vehicle_id}
                            >
                                <select required {...f('vehicle_id')}>
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.label} · {v.seats} seats
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="How many passengers? *"
                                error={form.errors.group_size}
                                hint={
                                    vehicle
                                        ? `This vehicle seats up to ${vehicle.seats}`
                                        : undefined
                                }
                            >
                                <input
                                    required
                                    type="number"
                                    min={1}
                                    max={vehicle?.seats ?? 60}
                                    {...f('group_size')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Trip">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Pick-up point *"
                                error={form.errors.pickup_location}
                            >
                                <input
                                    required
                                    maxLength={255}
                                    placeholder="e.g. Abuyog town plaza"
                                    {...f('pickup_location')}
                                />
                            </Field>
                            <Field
                                label="Drop-off point *"
                                error={form.errors.dropoff_location}
                            >
                                <input
                                    required
                                    maxLength={255}
                                    placeholder="e.g. Tacloban City hall"
                                    {...f('dropoff_location')}
                                />
                            </Field>
                            <Field
                                label="Pick-up date & time *"
                                error={form.errors.pickup_at}
                            >
                                <input
                                    required
                                    type="datetime-local"
                                    min={now}
                                    {...f('pickup_at')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Return trip (optional)">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Return location"
                                error={form.errors.return_location}
                            >
                                <input
                                    maxLength={255}
                                    placeholder="Where should the driver pick you up for the return?"
                                    {...f('return_location')}
                                />
                            </Field>
                            <Field
                                label="Return date & time"
                                error={form.errors.return_at}
                                hint="Fill in both, or leave both empty"
                            >
                                <input
                                    type="datetime-local"
                                    min={form.data.pickup_at || now}
                                    {...f('return_at')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Anything the driver should know?">
                        <div className="p-5">
                            <Field
                                label="Description"
                                error={form.errors.description}
                                hint={`${form.data.description.length}/1000. Luggage, stops along the way, the occasion, special needs.`}
                            >
                                <textarea
                                    rows={4}
                                    maxLength={1000}
                                    placeholder="e.g. Family reunion, 2 large bags, one stop at the market."
                                    {...f('description')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Sending…' : 'Send request'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/charters">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
