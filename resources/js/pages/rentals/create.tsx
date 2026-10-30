// The renter's form: who they are (the info the owner needs), when, and where.
// The price is never typed here: it is the owner's price per day x the number of days.
import { Head, Link, useForm } from '@inertiajs/react';
import { Field, inputCls, PageHeader, Panel } from '@/components/kit';
import { peso, toLocalInput } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    vehicle: {
        id: number;
        name: string;
        seats: number;
        daily_rate: string;
        owner: string;
    };
    defaults: { name: string; phone: string | null; address: string | null };
    max_days: number;
};

/** Every started 24 hours counts as a day (same rule as the server). */
function countDays(start: string, end: string): number {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();

    if (!start || !end || Number.isNaN(a) || Number.isNaN(b) || b <= a) {
        return 0;
    }

    return Math.max(1, Math.ceil((b - a) / 3_600_000 / 24));
}

export default function RentalCreate({ vehicle, defaults, max_days }: Props) {
    const form = useForm({
        vehicle_id: String(vehicle.id),
        renter_name: defaults.name ?? '',
        renter_phone: defaults.phone ?? '',
        renter_address: defaults.address ?? '',
        license_number: '',
        license_expiry: '',
        start_at: '',
        end_at: '',
        pickup_location: '',
        return_location: '',
        purpose: '',
    });
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
    const days = countDays(form.data.start_at, form.data.end_at);
    const total = days * Number(vehicle.daily_rate);

    return (
        <>
            <Head title="Rent a vehicle" />
            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
                <Link
                    href="/charters"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    ← Hire a driver
                </Link>
                <PageHeader
                    title={`Rent ${vehicle.name}`}
                    description={`Owner: ${vehicle.owner} · ${vehicle.seats} seats · ${peso(vehicle.daily_rate)} per day. You drive it yourself.`}
                />

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/rentals');
                    }}
                    className="space-y-6"
                >
                    {form.errors.vehicle_id && (
                        <p
                            role="alert"
                            className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm"
                        >
                            {form.errors.vehicle_id}
                        </p>
                    )}

                    <Panel title="About you">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Full name *"
                                error={form.errors.renter_name}
                            >
                                <input
                                    required
                                    maxLength={120}
                                    {...f('renter_name')}
                                />
                            </Field>
                            <Field
                                label="Contact number *"
                                error={form.errors.renter_phone}
                            >
                                <input
                                    required
                                    type="tel"
                                    maxLength={30}
                                    placeholder="09XX XXX XXXX"
                                    {...f('renter_phone')}
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field
                                    label="Home address *"
                                    error={form.errors.renter_address}
                                >
                                    <input
                                        required
                                        maxLength={255}
                                        {...f('renter_address')}
                                    />
                                </Field>
                            </div>
                            <Field
                                label="Driver’s licence number *"
                                error={form.errors.license_number}
                                hint="Only the owner sees this. It is stored encrypted."
                            >
                                <input
                                    required
                                    maxLength={40}
                                    autoComplete="off"
                                    {...f('license_number')}
                                />
                            </Field>
                            <Field
                                label="Licence expiry date *"
                                error={form.errors.license_expiry}
                                hint="Must be valid until you return the vehicle"
                            >
                                <input
                                    required
                                    type="date"
                                    min={now.slice(0, 10)}
                                    {...f('license_expiry')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="When">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Start date & time *"
                                error={form.errors.start_at}
                            >
                                <input
                                    required
                                    type="datetime-local"
                                    min={now}
                                    {...f('start_at')}
                                />
                            </Field>
                            <Field
                                label="Return date & time *"
                                error={form.errors.end_at}
                                hint={`Up to ${max_days} days. Every started 24 hours counts as one day.`}
                            >
                                <input
                                    required
                                    type="datetime-local"
                                    min={form.data.start_at || now}
                                    {...f('end_at')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Where">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Pick-up place *"
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
                                label="Return place *"
                                error={form.errors.return_location}
                            >
                                <input
                                    required
                                    maxLength={255}
                                    placeholder="e.g. Same as pick-up"
                                    {...f('return_location')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Anything the owner should know? (optional)">
                        <div className="p-5">
                            <Field
                                label="Purpose of the rental"
                                error={form.errors.purpose}
                                hint={`${form.data.purpose.length}/500`}
                            >
                                <textarea
                                    rows={3}
                                    maxLength={500}
                                    placeholder="e.g. Family vacation to Tacloban, 5 people."
                                    {...f('purpose')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {days > 0
                                    ? `${days} day${days === 1 ? '' : 's'} × ${peso(vehicle.daily_rate)}`
                                    : 'Pick your dates to see the total'}
                            </p>
                            <p className="font-serif text-2xl">
                                {days > 0 ? peso(total) : '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Pay the owner in cash at pick-up. Nothing is
                                charged online.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Sending…' : 'Send request'}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/charters">Cancel</Link>
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
