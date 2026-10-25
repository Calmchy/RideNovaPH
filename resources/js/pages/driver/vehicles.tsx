// Vehicle registration: list + add + edit + remove (all scoped to the signed-in driver on the server).
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    EmptyState,
    Field,
    inputCls,
    PageHeader,
    Panel,
    ReasonDialog,
} from '@/components/kit';
import { Button } from '@/components/ui/button';

type Vehicle = {
    id: number;
    model_id: number;
    name: string;
    color: string;
    plate_number: string;
    seat_capacity: number;
    manufacture_year: number | null;
    rides_count: number;
};
type Props = {
    has_profile: boolean;
    vehicles: Vehicle[];
    models: { id: number; label: string }[];
};

export default function Vehicles({ has_profile, vehicles, models }: Props) {
    const [editing, setEditing] = useState<Vehicle | null>(null);
    const form = useForm({
        model_id: '',
        color: '',
        plate_number: '',
        seat_capacity: '4',
        manufacture_year: '',
    });

    const reset = () => {
        setEditing(null);
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
        });
    };
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: reset };

        if (editing) {
            form.patch(`/driver/vehicles/${editing.id}`, opts);
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
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"
                            >
                                <div>
                                    <p className="font-medium">
                                        {v.name}{' '}
                                        <span className="text-muted-foreground">
                                            · {v.color}
                                        </span>
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
                        ))
                    ) : (
                        <EmptyState>
                            No vehicles yet. Add your first one.
                        </EmptyState>
                    )}
                </div>

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
                            </select>
                        </Field>
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
                                    form.setData('plate_number', e.target.value)
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
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={form.processing || !has_profile}
                                className="flex-1"
                            >
                                {editing ? 'Save changes' : 'Register vehicle'}
                            </Button>
                            {editing && (
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
            </div>
        </>
    );
}
