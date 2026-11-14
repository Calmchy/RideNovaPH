// "Rent my unit": the owner's own page. Publish a unit for rent (plate, VIN, front + back photos, price),
// set the terms & conditions, and handle the requests people send. (Separate from "Hire a driver" and Bookings.)
import { Head, Link, useForm } from '@inertiajs/react';
import { ImagePlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
    EmptyState,
    Field,
    inputCls,
    PageHeader,
    Panel,
} from '@/components/kit';
import {
    MyVehiclesPanel,
    RentalRequestsTable,
} from '@/components/rental-panels';
import type { MyVehicle, RentalRow } from '@/components/rental-panels';
import { Button } from '@/components/ui/button';

type Props = {
    my_vehicles: MyVehicle[];
    incoming_rentals: RentalRow[];
};

/** A photo picker that previews the chosen file (or the photo already on the unit). */
function PhotoPick({
    label,
    current,
    file,
    error,
    onPick,
}: {
    label: string;
    current: string | null;
    file: File | null;
    error?: string;
    onPick: (f: File | null) => void;
}) {
    const preview = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );

    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const shown = preview ?? current;

    return (
        <Field label={label} error={error}>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/30">
                {shown ? (
                    <img
                        src={shown}
                        alt={label}
                        className="size-full object-cover"
                    />
                ) : (
                    <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                        <ImagePlus className="size-6" /> Click to upload
                    </span>
                )}
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                />
            </div>
        </Field>
    );
}

function PublishUnitPanel({ vehicles }: { vehicles: MyVehicle[] }) {
    const first = vehicles[0];
    const form = useForm<{
        vehicle_id: string;
        plate_number: string;
        vin: string;
        daily_rate: string;
        photo_front: File | null;
        photo_back: File | null;
    }>({
        vehicle_id: String(first?.id ?? ''),
        plate_number: first?.plate_number ?? '',
        vin: first?.vin ?? '',
        daily_rate: first?.daily_rate ?? '',
        photo_front: null,
        photo_back: null,
    });

    const vehicle = useMemo(
        () => vehicles.find((v) => String(v.id) === form.data.vehicle_id),
        [vehicles, form.data.vehicle_id],
    );

    const choose = (id: string) => {
        const v = vehicles.find((x) => String(x.id) === id);
        form.setData({
            vehicle_id: id,
            plate_number: v?.plate_number ?? '',
            vin: v?.vin ?? '',
            daily_rate: v?.daily_rate ?? '',
            photo_front: null,
            photo_back: null,
        });
        form.clearErrors();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/rentals/vehicles/${form.data.vehicle_id}/publish`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () =>
                form.setData((d) => ({
                    ...d,
                    photo_front: null,
                    photo_back: null,
                })),
        });
    };

    if (!vehicles.length) {
        return (
            <Panel title="Publish a unit for rent">
                <EmptyState>
                    Register a vehicle first, then come back to publish it for
                    rent.{' '}
                    <Link
                        href="/driver/vehicles"
                        className="text-ocean underline dark:text-foam"
                    >
                        Go to My vehicles
                    </Link>
                </EmptyState>
            </Panel>
        );
    }

    return (
        <Panel title="Publish a unit for rent">
            <form onSubmit={submit} className="grid gap-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Vehicle *">
                        <select
                            className={inputCls}
                            value={form.data.vehicle_id}
                            onChange={(e) => choose(e.target.value)}
                        >
                            {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.label}
                                    {v.available_for_rent ? ' (listed)' : ''}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        label="Price per day (₱) *"
                        error={form.errors.daily_rate}
                    >
                        <input
                            type="number"
                            min={1}
                            max={100000}
                            step="1"
                            className={inputCls}
                            value={form.data.daily_rate}
                            onChange={(e) =>
                                form.setData('daily_rate', e.target.value)
                            }
                            placeholder="e.g. 1500"
                        />
                    </Field>
                    <Field
                        label="License plate number *"
                        error={form.errors.plate_number}
                    >
                        <input
                            className={`${inputCls} uppercase`}
                            value={form.data.plate_number}
                            onChange={(e) =>
                                form.setData('plate_number', e.target.value)
                            }
                            placeholder="ABC 1234"
                            maxLength={15}
                        />
                    </Field>
                    <Field
                        label="VIN (17 characters) *"
                        error={form.errors.vin}
                        hint="Found on the OR/CR and the dashboard or door jamb."
                    >
                        <input
                            className={`${inputCls} font-mono uppercase`}
                            value={form.data.vin}
                            onChange={(e) =>
                                form.setData(
                                    'vin',
                                    e.target.value.toUpperCase(),
                                )
                            }
                            placeholder="1HGCM82633A004352"
                            maxLength={17}
                        />
                    </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <PhotoPick
                        label="Photo of the front *"
                        current={vehicle?.photo_front ?? null}
                        file={form.data.photo_front}
                        error={form.errors.photo_front}
                        onPick={(f) => form.setData('photo_front', f)}
                    />
                    <PhotoPick
                        label="Photo of the back *"
                        current={vehicle?.photo_back ?? null}
                        file={form.data.photo_back}
                        error={form.errors.photo_back}
                        onPick={(f) => form.setData('photo_back', f)}
                    />
                </div>

                <div className="flex items-center justify-end gap-3">
                    <p className="text-xs text-muted-foreground">
                        Set your terms and conditions below after publishing.
                    </p>
                    <Button type="submit" disabled={form.processing}>
                        {vehicle?.available_for_rent
                            ? 'Update listing'
                            : 'Publish for rent'}
                    </Button>
                </div>
            </form>
        </Panel>
    );
}

export default function DriverRentals({
    my_vehicles,
    incoming_rentals,
}: Props) {
    return (
        <>
            <Head title="Rent my unit" />
            <PageHeader
                title="Rent my unit"
                description="Let someone rent your vehicle and drive it themselves. You set the price per day and your terms and conditions."
            />
            {/* Requests first, so the owner sees new ones right away. */}
            <Panel title="Rental requests for my vehicles">
                <RentalRequestsTable rows={incoming_rentals} who="Renter" />
            </Panel>
            <PublishUnitPanel vehicles={my_vehicles} />
            <MyVehiclesPanel vehicles={my_vehicles} />
        </>
    );
}
