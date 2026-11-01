// The renter's form: who they are (the info the owner needs), when, and where.
// The price is never typed here: it is the owner's price per day x the number of days.
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { Field, inputCls, PageHeader, Panel } from '@/components/kit';
import { peso, toLocalInput } from '@/components/lux';
import { RentalTermsList } from '@/components/rental-terms';
import type { TermRow } from '@/components/rental-terms';
import { Button } from '@/components/ui/button';

type Props = {
    vehicle: {
        id: number;
        name: string;
        seats: number;
        daily_rate: string;
        owner: string;
        terms: TermRow[];
        min_age: number | null;
        min_experience_years: number | null;
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

/** Account names are saved as "First M. Last"; split that back into the form's name boxes. Anything else is left blank. */
function splitName(full: string | null | undefined) {
    const blank = {
        renter_last_name: '',
        renter_first_name: '',
        renter_middle_initial: '',
        renter_name_ext: '',
    };
    const t = (full ?? '').trim().split(/\s+/).filter(Boolean);

    if (t.length === 2) {
        return { ...blank, renter_first_name: t[0], renter_last_name: t[1] };
    }

    if (t.length >= 3 && /^[A-Za-z]\.?$/.test(t[1])) {
        return {
            ...blank,
            renter_first_name: t[0],
            renter_middle_initial: t[1].replace('.', '').toUpperCase(),
            renter_last_name: t.slice(2).join(' '),
        };
    }

    return blank;
}

export default function RentalCreate({ vehicle, defaults, max_days }: Props) {
    const form = useForm({
        vehicle_id: String(vehicle.id),
        ...splitName(defaults.name),
        renter_phone: defaults.phone ?? '',
        renter_address: defaults.address ?? '',
        license_id: null as File | null,
        start_at: '',
        end_at: '',
        pickup_location: '',
        return_location: '',
        purpose: '',
        birth_date: '',
        license_type: 'non_professional',
        driving_years: '',
        passenger_count: '1',
        emergency_name: '',
        emergency_phone: '',
        emergency_relationship: '',
        emergency_address: '',
        destination: '',
        additional_drivers: '',
        signature_name: '',
        accept_terms: false,
    });
    const hasTerms = vehicle.terms.length > 0;
    const d = form.data;
    // Same format the server builds: "First M. Last Jr."
    const fullName = [
        d.renter_first_name.trim(),
        d.renter_middle_initial.trim()
            ? `${d.renter_middle_initial.trim().replace('.', '').toUpperCase()}.`
            : '',
        d.renter_last_name.trim(),
        d.renter_name_ext.trim(),
    ]
        .filter(Boolean)
        .join(' ');
    const licenseFile = form.data.license_id;
    const licensePreview = useMemo(
        () => (licenseFile ? URL.createObjectURL(licenseFile) : null),
        [licenseFile],
    );
    const minBirth = (() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 18);

        return d.toISOString().slice(0, 10);
    })();
    const f = (
        k: Exclude<keyof typeof form.data, 'accept_terms' | 'license_id'>,
    ) => ({
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

                    <Panel title={`1. Terms and conditions of ${vehicle.owner}`}>
                        {hasTerms ? (
                            <RentalTermsList rows={vehicle.terms} />
                        ) : (
                            <p className="p-5 text-sm text-muted-foreground">
                                The owner did not add extra terms for this
                                vehicle. The basic safety rules below still
                                apply to both of you.
                            </p>
                        )}
                        <div className="border-t p-5">
                            {form.data.accept_terms ? (
                                <p className="text-sm font-medium text-foam">
                                    ✓ You accepted {vehicle.owner}’s terms and
                                    conditions. Fill in your details below.
                                </p>
                            ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="max-w-xl text-sm text-muted-foreground">
                                        Read the terms above. You must accept
                                        them before you can fill in the rental
                                        form, so both of you are clear before
                                        anything is agreed.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            form.setData('accept_terms', true)
                                        }
                                    >
                                        I have read and accept the terms
                                    </Button>
                                </div>
                            )}
                            {form.errors.accept_terms && (
                                <p role="alert" className="mt-2 text-sm text-coral">
                                    {form.errors.accept_terms}
                                </p>
                            )}
                        </div>
                    </Panel>

                    {form.data.accept_terms && (
                        <>
                    <Panel title="2. About you">
                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <div className="grid items-start gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
                                <Field
                                    label="Last name *"
                                    error={form.errors.renter_last_name}
                                >
                                    <input
                                        required
                                        maxLength={100}
                                        {...f('renter_last_name')}
                                    />
                                </Field>
                                <Field
                                    label="First name *"
                                    error={form.errors.renter_first_name}
                                >
                                    <input
                                        required
                                        maxLength={100}
                                        {...f('renter_first_name')}
                                    />
                                </Field>
                                <Field
                                    label="Middle initial (optional)"
                                    error={form.errors.renter_middle_initial}
                                >
                                    <input
                                        maxLength={2}
                                        placeholder="e.g. D"
                                        {...f('renter_middle_initial')}
                                    />
                                </Field>
                                <Field
                                    label="Extension (if any)"
                                    error={form.errors.renter_name_ext}
                                >
                                    <input
                                        maxLength={10}
                                        placeholder="e.g. Jr., Sr., III"
                                        {...f('renter_name_ext')}
                                    />
                                </Field>
                            </div>
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
                            <div>
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
                                label="Upload licence ID *"
                                error={form.errors.license_id}
                                hint="A clear photo of your driver’s licence (JPG, PNG or WEBP, up to 5 MB). Only the owner sees it."
                            >
                                <input
                                    required
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) =>
                                        form.setData(
                                            'license_id',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                    className={inputCls}
                                />
                                {licensePreview && (
                                    <img
                                        src={licensePreview}
                                        alt="Your licence ID"
                                        className="mt-2 aspect-[4/3] w-full max-w-xs rounded-xl border object-cover"
                                    />
                                )}
                            </Field>
                            <Field
                                label="Date of birth *"
                                error={form.errors.birth_date}
                                hint={
                                    vehicle.min_age
                                        ? `The owner requires at least ${vehicle.min_age} years old.`
                                        : 'You must be at least 18. Stored encrypted.'
                                }
                            >
                                <input
                                    required
                                    type="date"
                                    max={minBirth}
                                    {...f('birth_date')}
                                />
                            </Field>
                            <Field
                                label="Licence type *"
                                error={form.errors.license_type}
                                hint="Foreign renters: use the International Driving Permit."
                            >
                                <select required {...f('license_type')}>
                                    <option value="non_professional">
                                        Non-professional
                                    </option>
                                    <option value="professional">
                                        Professional
                                    </option>
                                    <option value="international">
                                        International Driving Permit
                                    </option>
                                </select>
                            </Field>
                            <Field
                                label="Years of driving experience *"
                                error={form.errors.driving_years}
                                hint={
                                    vehicle.min_experience_years
                                        ? `The owner requires at least ${vehicle.min_experience_years} year(s).`
                                        : undefined
                                }
                            >
                                <input
                                    required
                                    type="number"
                                    min={0}
                                    max={80}
                                    step={1}
                                    {...f('driving_years')}
                                />
                            </Field>
                            <Field
                                label="How many people will ride? *"
                                error={form.errors.passenger_count}
                                hint={`This vehicle has ${vehicle.seats} seats, including the driver.`}
                            >
                                <input
                                    required
                                    type="number"
                                    min={1}
                                    max={vehicle.seats}
                                    step={1}
                                    {...f('passenger_count')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="3. Emergency contact">
                        <div className="grid items-start gap-4 p-5 sm:grid-cols-2">
                            <Field
                                label="Contact person *"
                                error={form.errors.emergency_name}
                                hint="Someone we can call if something happens. Not the driver."
                            >
                                <input
                                    required
                                    maxLength={120}
                                    {...f('emergency_name')}
                                />
                            </Field>
                            <Field
                                label="Relationship *"
                                error={form.errors.emergency_relationship}
                            >
                                <input
                                    required
                                    maxLength={50}
                                    placeholder="e.g. Father"
                                    {...f('emergency_relationship')}
                                />
                            </Field>
                            <Field
                                label="Contact number *"
                                error={form.errors.emergency_phone}
                            >
                                <input
                                    required
                                    type="tel"
                                    maxLength={30}
                                    placeholder="09XX XXX XXXX"
                                    {...f('emergency_phone')}
                                />
                            </Field>
                            <Field
                                label="Address *"
                                error={form.errors.emergency_address}
                                hint="In case this person can’t be reached by phone."
                            >
                                <input
                                    required
                                    maxLength={255}
                                    placeholder="House no., barangay, town, province"
                                    {...f('emergency_address')}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="4. When">
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

                    <Panel title="5. Where">
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
                            <div className="sm:col-span-2">
                                <Field
                                    label="Where will you drive it? *"
                                    error={form.errors.destination}
                                    hint="Towns or provinces. Tell the owner if you leave the area allowed in the terms."
                                >
                                    <input
                                        required
                                        maxLength={255}
                                        placeholder="e.g. Abuyog to Tacloban and back"
                                        {...f('destination')}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="6. Other drivers and notes (optional)">
                        <div className="grid gap-4 p-5">
                            <Field
                                label="Other people who will drive"
                                error={form.errors.additional_drivers}
                                hint="Full name and licence number of each. Only people listed here may drive."
                            >
                                <textarea
                                    rows={2}
                                    maxLength={500}
                                    {...f('additional_drivers')}
                                />
                            </Field>
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

                    <Panel title="7. Signature">
                        <div className="space-y-4 p-5 text-sm">
                            <div>
                                <p className="font-semibold">
                                    Basic safety rules for both of you
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                                    <li>
                                        Renter: drive only with a valid licence,
                                        never after drinking or taking drugs,
                                        carry no more people than seats, and
                                        follow traffic laws.
                                    </li>
                                    <li>
                                        Owner: hand over a roadworthy, registered
                                        vehicle as described in the listing and
                                        terms.
                                    </li>
                                    <li>
                                        Both: check the vehicle together at
                                        pick-up and return, and take photos of
                                        any scratches or dents.
                                    </li>
                                </ul>
                            </div>
                            <Field
                                label="Sign: type your full name *"
                                error={form.errors.signature_name}
                                hint={`By signing, you confirm everything you wrote is true and that you follow the terms you accepted. Type your name as: ${fullName || 'your full name above'}`}
                            >
                                <input
                                    required
                                    maxLength={120}
                                    autoComplete="off"
                                    {...f('signature_name')}
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
                        </>
                    )}
                </form>
            </div>
        </>
    );
}
