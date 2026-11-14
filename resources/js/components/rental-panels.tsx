// Vehicle-rental pieces shown on the "Hire a driver" page: the owner's rate editor and the request tables.
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    EmptyState,
    Field,
    inputCls,
    Panel,
    tableCls,
    tdCls,
    thCls,
} from '@/components/kit';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { RentalTermsEditor } from '@/components/rental-terms';
import type { TermsData } from '@/components/rental-terms';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export type RentalRow = {
    id: number;
    reference_no: string;
    status: string;
    other: string;
    vehicle: string;
    start_at: string;
    end_at: string;
    days: number;
    total_price: string;
};

export type MyVehicle = {
    id: number;
    label: string;
    plate_number: string;
    vin: string | null;
    photo_front: string | null;
    photo_back: string | null;
    available_for_rent: boolean;
    daily_rate: string | null;
    rental_terms: TermsData;
};

export function RentalRequestsTable({
    rows,
    who,
}: {
    rows: RentalRow[];
    who: string;
}) {
    if (!rows.length) {
        return <EmptyState>Nothing here yet.</EmptyState>;
    }

    return (
        <div className="overflow-x-auto">
            <table className={tableCls}>
                <thead className="border-b bg-muted/50">
                    <tr>
                        {[
                            'Reference',
                            who,
                            'Vehicle',
                            'From',
                            'Days',
                            'Total',
                            'Status',
                            '',
                        ].map((h) => (
                            <th key={h} className={thCls}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td className={`${tdCls} font-mono text-xs`}>
                                {r.reference_no}
                            </td>
                            <td className={tdCls}>{r.other}</td>
                            <td className={tdCls}>{r.vehicle}</td>
                            <td className={tdCls}>{fmtDateTime(r.start_at)}</td>
                            <td className={tdCls}>{r.days}</td>
                            <td className={tdCls}>{peso(r.total_price)}</td>
                            <td className={tdCls}>
                                <StatusBadge status={r.status} />
                            </td>
                            <td className={tdCls}>
                                <Button asChild size="sm" variant="outline">
                                    <Link href={`/rentals/${r.id}`}>Open</Link>
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** One of MY vehicles: on/off switch + the price per day (only the owner can change it). */
/** The owner's "Publish my unit for rent" form: plate, VIN, front and back photos, price per day. */
function PublishDialog({ v }: { v: MyVehicle }) {
    const [open, setOpen] = useState(false);
    const form = useForm<{
        plate_number: string;
        vin: string;
        daily_rate: string;
        photo_front: File | null;
        photo_back: File | null;
    }>({
        plate_number: v.plate_number,
        vin: v.vin ?? '',
        daily_rate: v.daily_rate ?? '',
        photo_front: null,
        photo_back: null,
    });
    const photo = (key: 'photo_front' | 'photo_back', label: string, current: string | null) => (
        <Field label={`${label} photo ${current ? '' : '*'}`} error={form.errors[key]} hint={current ? 'Leave empty to keep the current photo.' : 'JPG, PNG or WEBP, up to 5 MB.'}>
            {current && (
                <img src={current} alt={`${label} of ${v.label}`} className="mb-2 aspect-[4/3] w-40 rounded-lg border object-cover" />
            )}
            <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required={!current}
                onChange={(e) => form.setData(key, e.target.files?.[0] ?? null)}
                className={inputCls}
            />
        </Field>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    {v.available_for_rent ? 'Edit listing' : 'Publish for rent'}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Publish {v.label} for rent</DialogTitle>
                    <DialogDescription>
                        Renters see these details and the photos on the “Rent a
                        vehicle” page. They drive the unit themselves.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(`/rentals/vehicles/${v.id}/publish`, {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => setOpen(false),
                        });
                    }}
                >
                    <Field label="Plate number *" error={form.errors.plate_number}>
                        <input
                            required
                            maxLength={15}
                            value={form.data.plate_number}
                            onChange={(e) => form.setData('plate_number', e.target.value.toUpperCase())}
                            className={inputCls}
                        />
                    </Field>
                    <Field
                        label="VIN (vehicle identification number) *"
                        error={form.errors.vin}
                        hint="17 letters and numbers, no I, O or Q. It is on your OR/CR."
                    >
                        <input
                            required
                            maxLength={17}
                            value={form.data.vin}
                            onChange={(e) => form.setData('vin', e.target.value.toUpperCase())}
                            className={inputCls}
                        />
                    </Field>
                    {photo('photo_front', 'Front', v.photo_front)}
                    {photo('photo_back', 'Back', v.photo_back)}
                    <Field label="Price per day (₱) *" error={form.errors.daily_rate}>
                        <input
                            required
                            type="number"
                            min={1}
                            max={100000}
                            step="1"
                            value={form.data.daily_rate}
                            onChange={(e) => form.setData('daily_rate', e.target.value)}
                            className={inputCls}
                        />
                    </Field>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Publishing…' : v.available_for_rent ? 'Save listing' : 'Publish'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MyVehicleRow({ v }: { v: MyVehicle }) {
    const [terms, setTerms] = useState<TermsData>(v.rental_terms ?? {});
    const [showTerms, setShowTerms] = useState(false);
    const [saving, setSaving] = useState(false);
    const filled = Object.values(terms).filter((x) => String(x) !== '').length;

    // Terms and the on/off switch are saved with the same call; the price and photos come from "Publish".
    const patch = (listed: boolean) =>
        router.patch(
            `/rentals/vehicles/${v.id}`,
            { available_for_rent: listed, daily_rate: v.daily_rate, terms },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );

    return (
        <li>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                    <span className="font-medium">{v.label}</span>
                    <p className="text-sm text-muted-foreground">
                        {v.available_for_rent
                            ? `Listed for rent · ${peso(v.daily_rate ?? 0)} / day`
                            : 'Not listed for rent'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <PublishDialog v={v} />
                    {v.available_for_rent && (
                        <Button size="sm" variant="outline" type="button" disabled={saving} onClick={() => patch(false)}>
                            Unlist
                        </Button>
                    )}
                    <Button size="sm" variant="outline" type="button" onClick={() => setShowTerms((x) => !x)}>
                        {showTerms
                            ? 'Hide terms'
                            : filled
                              ? `Terms & conditions (${filled})`
                              : 'Add terms & conditions'}
                    </Button>
                    {showTerms && (
                        <Button size="sm" type="button" disabled={saving} onClick={() => patch(v.available_for_rent)}>
                            {saving ? 'Saving…' : 'Save terms'}
                        </Button>
                    )}
                </div>
            </div>
            {showTerms && <RentalTermsEditor value={terms} onChange={setTerms} />}
        </li>
    );
}

/** Owner only: switch each vehicle on/off for rent and set the price per day. */
export function MyVehiclesPanel({ vehicles }: { vehicles: MyVehicle[] }) {
    return (
        <Panel title="My vehicles for rent (renter drives, you set the price per day)">
            {vehicles.length ? (
                <ul className="divide-y">
                    {vehicles.map((v) => (
                        <MyVehicleRow key={v.id} v={v} />
                    ))}
                </ul>
            ) : (
                <EmptyState>Add a vehicle first (Driver → Vehicles).</EmptyState>
            )}
        </Panel>
    );
}
