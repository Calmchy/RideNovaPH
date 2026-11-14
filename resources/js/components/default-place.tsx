// "Save as my default": remembers a province + town so From starts filled in (finding or publishing a ride).
import { router } from '@inertiajs/react';
import { Home } from 'lucide-react';
import type { KnownCity, PlaceValue } from '@/components/place-picker';

type Saved = { province: string; place: string };

export function DefaultPlace({
    current,
    value,
    cities,
}: {
    current: Saved | null;
    value: PlaceValue;
    cities: KnownCity[];
}) {
    // A known city carries only its id: look up its province and name.
    const city = value.id
        ? cities.find((c) => String(c.id) === String(value.id))
        : null;
    const picked: Saved | null = city
        ? { province: city.province, place: city.name }
        : value.place
          ? { province: value.province, place: value.place }
          : null;

    const label = (s: Saved) =>
        s.province ? `${s.place}, ${s.province}` : s.place;
    const same =
        picked &&
        current &&
        picked.place === current.place &&
        picked.province === current.province;

    const save = () =>
        picked &&
        router.post('/settings/default-place', picked, {
            preserveScroll: true,
            preserveState: true,
        });
    const remove = () =>
        router.delete('/settings/default-place', {
            preserveScroll: true,
            preserveState: true,
        });

    return (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {current && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Home className="size-3" /> Default: {label(current)}
                    <button
                        type="button"
                        onClick={remove}
                        className="ml-1 underline hover:text-foreground"
                    >
                        Remove
                    </button>
                </span>
            )}
            {picked && !same && (
                <button
                    type="button"
                    onClick={save}
                    className="font-medium text-primary underline"
                >
                    Save {label(picked)} as my default
                </button>
            )}
            {!current && !picked && (
                <span className="text-muted-foreground">
                    Pick a place, then save it as your default.
                </span>
            )}
        </span>
    );
}
