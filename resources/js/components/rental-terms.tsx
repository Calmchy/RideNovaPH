// Terms & Conditions for renting a vehicle: the owner's editor and the read-only list the renter sees.
import { inputCls } from '@/components/kit';

export type TermRow = { key: string; label: string; value: string };
export type TermsData = Record<string, string | number>;

type FieldDef = {
    key: string;
    label: string;
    kind: 'text' | 'string' | 'number' | 'int' | 'fuel' | 'unit';
    hint?: string;
    max?: number;
};

const FUEL: [string, string][] = [
    ['full_to_full', 'Full to full (returned with a full tank)'],
    ['same_level', 'Return with the same fuel level'],
    ['refuel_charge', 'Refuelling charge applies'],
];

// Same keys and order as App\Support\RentalTerms::FIELDS on the server.
const SECTIONS: { title: string; fields: FieldDef[] }[] = [
    {
        title: 'Vehicle',
        fields: [
            { key: 'vin', label: 'VIN / chassis number', kind: 'string', max: 40 },
        ],
    },
    {
        title: 'Late return fee',
        fields: [
            {
                key: 'late_fee_amount',
                label: 'Fee amount (₱)',
                kind: 'number',
            },
            { key: 'late_fee_unit', label: 'Charged per', kind: 'unit' },
            {
                key: 'late_fee_description',
                label: 'Description',
                kind: 'text',
                hint: 'e.g. Counted from the agreed return time. A late return of more than 3 hours is charged as a full day.',
            },
        ],
    },
    {
        title: 'Other fees',
        fields: [
            {
                key: 'extra_fees',
                label: 'Delivery / pick-up, cleaning, etc.',
                kind: 'text',
            },
        ],
    },
    {
        title: 'Security deposit',
        fields: [
            { key: 'deposit_amount', label: 'Deposit amount (₱)', kind: 'number' },
            {
                key: 'deposit_terms',
                label: 'Refund / deduction conditions',
                kind: 'text',
                hint: 'e.g. Refunded on return if there is no new damage.',
            },
        ],
    },
    {
        title: 'Insurance and liability',
        fields: [
            {
                key: 'insurance',
                label: 'Coverage, deductible and who pays for damage, theft and traffic fines',
                kind: 'text',
                max: 700,
            },
        ],
    },
    {
        title: 'Fuel',
        fields: [
            { key: 'fuel_policy', label: 'Fuel policy', kind: 'fuel' },
            { key: 'fuel_notes', label: 'Fuel notes', kind: 'string', max: 200 },
        ],
    },
    {
        title: 'Use of the vehicle',
        fields: [
            {
                key: 'allowed_area',
                label: 'Where it may be driven',
                kind: 'text',
                hint: 'e.g. Leyte only. No off-road. No inter-island trips without permission.',
            },
            {
                key: 'prohibited',
                label: 'Not allowed',
                kind: 'text',
                hint: 'e.g. Racing, towing, subleasing, smoking.',
            },
        ],
    },
    {
        title: 'Driver requirements',
        fields: [
            { key: 'min_age', label: 'Minimum age', kind: 'int' },
            { key: 'min_experience_years', label: 'Driving experience (years)', kind: 'int' },
            {
                key: 'driver_requirements',
                label: 'Other requirements',
                kind: 'text',
                hint: 'e.g. Valid professional or non-professional licence. IDP for foreigners.',
            },
        ],
    },
    {
        title: 'Inspection',
        fields: [
            {
                key: 'inspection',
                label: 'Before and after the rental',
                kind: 'text',
                hint: 'e.g. We check the car together and take photos of any scratches.',
            },
        ],
    },
    {
        title: 'Cancellation',
        fields: [
            { key: 'free_cancel_hours', label: 'Free cancellation until (hours before pick-up)', kind: 'int' },
            {
                key: 'cancellation_terms',
                label: 'Cancellation and no-show policy',
                kind: 'text',
            },
        ],
    },
    {
        title: 'Anything else',
        fields: [{ key: 'other', label: 'Other terms', kind: 'text', max: 1000 }],
    },
];

/** Owner: edit the terms of ONE vehicle. The parent keeps the state and sends it with the Save button. */
export function RentalTermsEditor({
    value,
    onChange,
}: {
    value: TermsData;
    onChange: (next: TermsData) => void;
}) {
    const set = (key: string, v: string) => onChange({ ...value, [key]: v });

    return (
        <div className="grid gap-5 border-t bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
                Optional. Renters must read and agree to these before they can
                send a request. The renter’s details, dates and price are
                already in the request, so you only write your own rules here.
            </p>
            {SECTIONS.map((s) => (
                <fieldset key={s.title} className="grid gap-3">
                    <legend className="mb-1 text-sm font-semibold">{s.title}</legend>
                    {s.fields.map((f) => (
                        <label key={f.key} className="grid gap-1 text-sm">
                            <span className="text-muted-foreground">{f.label}</span>
                            {f.kind === 'text' ? (
                                <textarea
                                    rows={2}
                                    maxLength={f.max ?? 500}
                                    value={String(value[f.key] ?? '')}
                                    placeholder={f.hint}
                                    onChange={(e) => set(f.key, e.target.value)}
                                    className={inputCls}
                                />
                            ) : f.kind === 'unit' ? (
                                <select
                                    value={String(value[f.key] ?? '')}
                                    onChange={(e) => set(f.key, e.target.value)}
                                    className={`${inputCls} max-w-40`}
                                >
                                    <option value="hour">Hour</option>
                                    <option value="day">Day</option>
                                </select>
                            ) : f.kind === 'fuel' ? (
                                <select
                                    value={String(value[f.key] ?? '')}
                                    onChange={(e) => set(f.key, e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="">Not specified</option>
                                    {FUEL.map(([k, l]) => (
                                        <option key={k} value={k}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={f.kind === 'string' ? 'text' : 'number'}
                                    min={f.kind === 'string' ? undefined : 0}
                                    step={f.kind === 'int' ? 1 : f.kind === 'number' ? 'any' : undefined}
                                    maxLength={f.kind === 'string' ? (f.max ?? 200) : undefined}
                                    value={String(value[f.key] ?? '')}
                                    onChange={(e) => set(f.key, e.target.value)}
                                    className={`${inputCls} ${f.kind === 'string' ? '' : 'max-w-40'}`}
                                />
                            )}
                        </label>
                    ))}
                </fieldset>
            ))}
        </div>
    );
}

/** Read-only list (renter before sending, both people afterwards). */
export function RentalTermsList({ rows }: { rows: TermRow[] }) {
    return (
        <dl className="grid gap-4 p-5 text-sm">
            {rows.map((r) => (
                <div key={r.key}>
                    <dt className="text-muted-foreground">{r.label}</dt>
                    <dd className="mt-0.5 whitespace-pre-line font-medium">{r.value}</dd>
                </div>
            ))}
        </dl>
    );
}
