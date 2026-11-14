// "Rent a vehicle": every vehicle an owner has published for rent, so passengers/renters can browse and pick one.
import { Head, Link } from '@inertiajs/react';
import { Users } from 'lucide-react';
import { useState } from 'react';
import {
    EmptyState,
    FilterBar,
    PageHeader,
    SimplePager,
} from '@/components/kit';
import type { SimplePaginated } from '@/components/kit';
import { peso } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Vehicle = {
    id: number;
    name: string;
    plate_number: string;
    seats: number;
    year: number | null;
    daily_rate: string;
    owner: string;
    photo_front: string | null;
    photo_back: string | null;
    description: string | null;
    rented_out: boolean;
};

/** Front photo by default; the tabs flip to the back. */
function Photos({ v }: { v: Vehicle }) {
    const [side, setSide] = useState<'front' | 'back'>('front');
    const src = side === 'front' ? v.photo_front : v.photo_back;

    return (
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {src ? (
                <img
                    src={src}
                    alt={`${v.name} ${side}`}
                    className="size-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    No {side} photo yet
                </div>
            )}
            <div className="absolute bottom-2 left-2 flex gap-1 rounded-full bg-black/55 p-0.5 text-xs text-white backdrop-blur">
                {(['front', 'back'] as const).map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setSide(s)}
                        className={`rounded-full px-2.5 py-0.5 capitalize ${side === s ? 'bg-white text-black' : ''}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function RentBrowse({
    vehicles,
    filters,
}: {
    vehicles: SimplePaginated<Vehicle>;
    filters: Record<string, string>;
}) {
    return (
        <>
            <Head title="Rent a vehicle" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <PageHeader
                    title="Rent a vehicle"
                    description="Vehicles listed for rent by our approved drivers. You drive it yourself; the owner sets the price per day and the terms."
                />
                <FilterBar
                    url="/rent"
                    values={filters}
                    fields={[
                        {
                            name: 'q',
                            type: 'search',
                            placeholder: 'Search make, model or colour',
                        },
                        {
                            name: 'sort',
                            type: 'select',
                            label: 'Sort',
                            placeholder: 'Newest listed',
                            options: [
                                {
                                    value: 'price_asc',
                                    label: 'Price: low to high',
                                },
                                {
                                    value: 'price_desc',
                                    label: 'Price: high to low',
                                },
                            ],
                        },
                    ]}
                />

                {vehicles.data.length ? (
                    <>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {vehicles.data.map((v) => (
                                <article
                                    key={v.id}
                                    className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
                                >
                                    <Photos v={v} />
                                    <div className="flex flex-1 flex-col gap-3 p-5">
                                        <div>
                                            <h3 className="font-semibold">
                                                {v.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Plate {v.plate_number}
                                                {v.year ? ` · ${v.year}` : ''}
                                            </p>
                                        </div>
                                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Users className="size-4" />{' '}
                                            {v.seats} seats · Owner: {v.owner}
                                        </p>
                                        {v.description && (
                                            <p className="line-clamp-2 text-sm text-muted-foreground">
                                                {v.description}
                                            </p>
                                        )}
                                        <div className="mt-auto flex items-center justify-between gap-3">
                                            <p className="text-lg font-semibold">
                                                {peso(v.daily_rate)}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    {' '}
                                                    / day
                                                </span>
                                            </p>
                                            {v.rented_out ? (
                                                <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300">
                                                    Currently rented
                                                </span>
                                            ) : (
                                                <Button asChild size="sm">
                                                    <Link
                                                        href={`/rentals/new?vehicle=${v.id}`}
                                                    >
                                                        Rent this vehicle
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                        <SimplePager page={vehicles} />
                    </>
                ) : (
                    <EmptyState>
                        No vehicles are listed for rent right now. Please check
                        again later.
                    </EmptyState>
                )}
            </div>
        </>
    );
}
