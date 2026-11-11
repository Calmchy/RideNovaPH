// Vehicle registration: list + add + edit + remove (all scoped to the signed-in driver on the server).
// Each vehicle shows an editable photo banner (front / back / interior) with a description panel below.
import { Head, router, useForm } from '@inertiajs/react';
import { BadgeCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import DocTile from '@/components/doc-tile';
import {
    EmptyState,
    Field,
    inputCls,
    PageHeader,
    Panel,
    ReasonDialog,
} from '@/components/kit';
import { Button } from '@/components/ui/button';
import VehicleBanner from '@/components/vehicle-banner';
import type { VehiclePhoto } from '@/components/vehicle-banner';

type Vehicle = {
    id: number;
    model_id: number;
    name: string;
    color: string;
    plate_number: string;
    seat_capacity: number;
    manufacture_year: number | null;
    rides_count: number;
    photos: VehiclePhoto[];
    description: string | null;
    cor_url: string | null;
    review_status: 'pending' | 'approved' | 'rejected';
    review_remarks: string | null;
};
type VehicleForm = {
    model_id: string;
    color: string;
    plate_number: string;
    seat_capacity: string;
    manufacture_year: string;
    custom_make: string;
    custom_model: string;
};
type Props = {
    has_profile: boolean;
    vehicles: Vehicle[];
    models: { id: number; label: string }[];
    /** ISO time the next vehicle may be registered (2 minutes after the last), or null. */
    next_vehicle_at: string | null;
};

export default function Vehicles({
    has_profile,
    vehicles,
    models,
    next_vehicle_at,
}: Props) {
    const [clock, setClock] = useState(() => Date.now());
    const waitMs = next_vehicle_at
        ? new Date(next_vehicle_at).getTime() - clock
        : 0;
    const waiting = waitMs > 0;

    useEffect(() => {
        if (!waiting) {
            return;
        }

        const t = setInterval(() => setClock(Date.now()), 1000);

        return () => clearInterval(t);
    }, [waiting]);

    const waitText = `${Math.floor(waitMs / 60000)}:${String(Math.floor((waitMs % 60000) / 1000)).padStart(2, '0')}`;
    const [editing, setEditing] = useState<Vehicle | null>(null);
    // Once a driver has a vehicle, the form stays hidden until they ask to add another.
    const [adding, setAdding] = useState(false);
    const showForm = editing !== null || adding || vehicles.length === 0;
    const form = useForm<VehicleForm>({
        model_id: '',
        color: '',
        plate_number: '',
        seat_capacity: '4',
        manufacture_year: '',
        custom_make: '',
        custom_model: '',
    });

    const reset = () => {
        setEditing(null);
        setAdding(false);
        form.reset();
        form.clearErrors();
    };
    const edit = (v: Vehicle) => {
        setEditing(v);
        form.setData({
            model_id: String(v.model_id),
            color: v.color,
            plate_number: v.plate_number,
            seat_capacity: String(v.seat_capacity),
            manufacture_year: v.manufacture_year
                ? String(v.manufacture_year)
                : '',
            custom_make: '',
            custom_model: '',
        });
    };
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: reset };

        if (editing) {
            form.transform(
                ({
                    model_id,
                    color,
                    plate_number,
                    seat_capacity,
                    manufacture_year,
                    custom_make,
                    custom_model,
                }) => ({
                    model_id,
                    color,
                    plate_number,
                    seat_capacity,
                    manufacture_year,
                    custom_make,
                    custom_model,
                }),
            );
            form.patch(`/driver/vehicles/${editing.id}`, opts);
            form.transform((d) => d);
        } else {
            form.post('/driver/vehicles', opts);
        }
    };

    return (
        <>
            <Head title="Vehicles" />
            <PageHeader
                title="Vehicles"
                description="Register the car or van you use. You choose one of these whenever you publish a ride."
            />

            {!has_profile && (
                <p className="rounded-2xl border border-sand bg-sand/30 p-4 text-sm">
                    Submit your driver licence first (Licence tab) so you can
                    register vehicles.
                </p>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-3">
                    {vehicles.length ? (
                        vehicles.map((v) => (
                            <div
                                key={v.id}
                                className="space-y-3 rounded-2xl border bg-card p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="flex flex-wrap items-center gap-2 font-medium">
                                            <span>
                                                {v.name}{' '}
                                                <span className="text-muted-foreground">
                                                    · {v.color}
                                                </span>
                                            </span>
                                            {v.review_status === 'approved' ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                                                    <BadgeCheck className="size-3.5" />
                                                    Registered Vehicle
                                                </span>
                                            ) : v.review_status ===
                                              'rejected' ? (
                                                <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-300">
                                                    Rejected
                                                </span>
                                            ) : (
                                                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                    Waiting for admin review
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-mono">
                                                {v.plate_number}
                                            </span>{' '}
                                            · {v.seat_capacity} seats
                                            {v.manufacture_year &&
                                                ` · ${v.manufacture_year}`}{' '}
                                            · {v.rides_count} ride(s)
                                        </p>
                                        {v.review_status === 'rejected' && (
                                            <p className="mt-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-700 dark:text-red-300">
                                                Rejected by the admin:{' '}
                                                {v.review_remarks ??
                                                    'no reason given'}
                                                . Update the photos or COR and
                                                it goes back for review.
                                            </p>
                                        )}
                                        {v.review_status === 'pending' && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Add the front/back photos and
                                                COR. You can publish rides with
                                                this vehicle once an admin
                                                approves it.
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => edit(v)}
                                        >
                                            <Pencil /> Edit
                                        </Button>
                                        <ReasonDialog
                                            title="Remove this vehicle?"
                                            description="Vehicles with ride history can’t be removed."
                                            askReason={false}
                                            confirmLabel="Remove"
                                            destructive
                                            onConfirm={() =>
                                                router.delete(
                                                    `/driver/vehicles/${v.id}`,
                                                    { preserveScroll: true },
                                                )
                                            }
                                            trigger={
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    aria-label="Remove vehicle"
                                                >
                                                    <Trash2 />
                                                </Button>
                                            }
                                        />
                                    </div>
                                </div>

                                <VehicleBanner
                                    photos={v.photos}
                                    description={v.description}
                                    editable={{
                                        photoUrl: (key) =>
                                            `/driver/vehicles/${v.id}/photos/${key}`,
                                        descriptionUrl: `/driver/vehicles/${v.id}/description`,
                                    }}
                                />

                                <div className="max-w-xs">
                                    <DocTile
                                        label="COR (Certificate of Registration)"
                                        url={v.cor_url}
                                        emptyText="COR not uploaded yet"
                                        upload={{
                                            url: `/driver/vehicles/${v.id}/cor`,
                                            field: 'cor_image',
                                            label: v.cor_url
                                                ? 'Replace COR'
                                                : 'Upload COR',
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <EmptyState>
                            No vehicles yet. Add your first one.
                        </EmptyState>
                    )}
                </div>

                {!showForm && (
                    <div className="h-fit space-y-3 rounded-2xl border bg-card p-5">
                        <p className="flex items-center gap-2 text-sm font-medium">
                            <BadgeCheck className="size-4 text-emerald-500" />
                            {vehicles.length === 1
                                ? 'Your vehicle is registered'
                                : `${vehicles.length} vehicles registered`}
                        </p>
                        <Button
                            className="w-full"
                            disabled={!has_profile || waiting}
                            onClick={() => setAdding(true)}
                        >
                            <Plus /> Add another vehicle
                        </Button>
                        {waiting && (
                            <p className="text-xs text-muted-foreground">
                                You can register another vehicle in {waitText}.
                                This short wait keeps the system free of spam.
                            </p>
                        )}
                    </div>
                )}
                {showForm && (
                    <Panel
                        title={editing ? 'Edit vehicle' : 'Add a vehicle'}
                        className="h-fit"
                    >
                        <form onSubmit={submit} className="grid gap-4 p-5">
                            <Field
                                label="Make & model"
                                error={form.errors.model_id}
                            >
                                <select
                                    required
                                    value={form.data.model_id}
                                    onChange={(e) =>
                                        form.setData('model_id', e.target.value)
                                    }
                                    className={inputCls}
                                >
                                    <option value="">Choose…</option>
                                    {models.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.label}
                                        </option>
                                    ))}
                                    <option value="other">
                                        Other (type my own)
                                    </option>
                                </select>
                            </Field>
                            {form.data.model_id === 'other' && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field
                                        label="Make (brand)"
                                        error={form.errors.custom_make}
                                    >
                                        <input
                                            required
                                            maxLength={50}
                                            placeholder="e.g. Honda"
                                            value={form.data.custom_make}
                                            onChange={(e) =>
                                                form.setData(
                                                    'custom_make',
                                                    e.target.value,
                                                )
                                            }
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field
                                        label="Model"
                                        error={form.errors.custom_model}
                                    >
                                        <input
                                            required
                                            maxLength={50}
                                            placeholder="e.g. Civic"
                                            value={form.data.custom_model}
                                            onChange={(e) =>
                                                form.setData(
                                                    'custom_model',
                                                    e.target.value,
                                                )
                                            }
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>
                            )}
                            <Field label="Colour" error={form.errors.color}>
                                <input
                                    required
                                    value={form.data.color}
                                    onChange={(e) =>
                                        form.setData('color', e.target.value)
                                    }
                                    className={inputCls}
                                />
                            </Field>
                            <Field
                                label="Plate number"
                                error={form.errors.plate_number}
                                hint="e.g. ABC 1234"
                            >
                                <input
                                    required
                                    value={form.data.plate_number}
                                    onChange={(e) =>
                                        form.setData(
                                            'plate_number',
                                            e.target.value,
                                        )
                                    }
                                    className={inputCls}
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    label="Passenger seats"
                                    error={form.errors.seat_capacity}
                                >
                                    <input
                                        required
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={form.data.seat_capacity}
                                        onChange={(e) =>
                                            form.setData(
                                                'seat_capacity',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                </Field>
                                <Field
                                    label="Year"
                                    error={form.errors.manufacture_year}
                                >
                                    <input
                                        type="number"
                                        min={1990}
                                        value={form.data.manufacture_year}
                                        onChange={(e) =>
                                            form.setData(
                                                'manufacture_year',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {editing
                                    ? 'Change photos, the COR and the description from the vehicle’s card.'
                                    : 'After you register, add the photos, the COR and a description from the vehicle’s card.'}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={form.processing || !has_profile}
                                    className="flex-1"
                                >
                                    {editing
                                        ? 'Save changes'
                                        : 'Register vehicle'}
                                </Button>
                                {(editing || vehicles.length > 0) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={reset}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Panel>
                )}
            </div>
        </>
    );
}
