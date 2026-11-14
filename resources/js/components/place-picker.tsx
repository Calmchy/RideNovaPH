// Pick a Philippine town (filter by province, or search), or type your own place.
// Reports either an existing city id, or a province + place the server turns into a city.
import { MapPin, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { inputCls } from '@/components/kit';

export type Province = { name: string; towns: string[] };
export type KnownCity = { id: number; name: string; province: string };
export type PlaceValue = { id: string; province: string; place: string };

type Option = { province: string; name: string; id?: number };

const MAX_SHOWN = 60;

export function PlacePicker({
    value,
    onChange,
    places,
    cities,
    disabled,
    placeholder = 'Search a town or type your own…',
}: {
    value: PlaceValue;
    onChange: (v: PlaceValue) => void;
    places: Province[];
    cities: KnownCity[];
    disabled?: boolean;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [province, setProvince] = useState('');
    const box = useRef<HTMLDivElement>(null);

    // Built-in list plus any city already in the database (they keep their id).
    const options = useMemo(() => {
        const seen = new Map<string, Option>();

        for (const c of cities) {
            seen.set(`${c.province}|${c.name}`.toLowerCase(), { province: c.province, name: c.name, id: c.id });
        }

        for (const p of places) {
            for (const t of p.towns) {
                const k = `${p.name}|${t}`.toLowerCase();

                if (!seen.has(k)) {
                    seen.set(k, { province: p.name, name: t });
                }
            }
        }

        return [...seen.values()];
    }, [places, cities]);

    const provinceNames = useMemo(
        () => [...new Set([...places.map((p) => p.name), ...cities.map((c) => c.province).filter(Boolean)])].sort(),
        [places, cities],
    );

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close);

        return () => document.removeEventListener('mousedown', close);
    }, []);

    const q = query.trim().toLowerCase();
    const matches = useMemo(() => {
        const list = options.filter(
            (o) =>
                (!province || o.province === province) &&
                (!q || o.name.toLowerCase().includes(q) || o.province.toLowerCase().includes(q)),
        );
        // Names that START with what you typed come first.
        list.sort(
            (a, b) =>
                Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) ||
                a.name.localeCompare(b.name),
        );

        return list.slice(0, MAX_SHOWN);
    }, [options, province, q]);

    // What is currently chosen, as text.
    const chosen = value.id
        ? cities.find((c) => String(c.id) === value.id)
        : value.place
          ? { name: value.place, province: value.province }
          : null;

    const pick = (o: Option) => {
        onChange(o.id ? { id: String(o.id), province: '', place: '' } : { id: '', province: o.province, place: o.name });
        setOpen(false);
        setQuery('');
    };

    const own = query.trim();
    const exact = options.some((o) => o.name.toLowerCase() === q && (!province || o.province === province));
    const canUseOwn = own.length >= 2 && !exact;

    if (disabled) {
        return (
            <div className={`${inputCls} opacity-60`}>
                {chosen ? `${chosen.name}${chosen.province ? `, ${chosen.province}` : ''}` : '—'}
            </div>
        );
    }

    return (
        <div ref={box} className="relative">
            {chosen && !open ? (
                <div className={`${inputCls} flex items-center justify-between gap-2`}>
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(true)}>
                        <MapPin className="size-4 shrink-0 text-ocean" />
                        <span className="truncate">
                            {chosen.name}
                            {chosen.province && <span className="text-muted-foreground">, {chosen.province}</span>}
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-label="Clear"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onChange({ id: '', province: '', place: '' })}
                    >
                        <X className="size-4" />
                    </button>
                </div>
            ) : (
                <input
                    className={inputCls}
                    value={query}
                    placeholder={placeholder}
                    maxLength={80}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setOpen(false);
                        }

                        if (e.key === 'Enter') {
                            e.preventDefault();

                            if (matches[0] && q) {
                                pick(matches[0]);
                            }
                        }
                    }}
                    autoComplete="off"
                />
            )}
            {open && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
                    <div className="border-b p-2">
                        <select
                            className={inputCls}
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                            aria-label="Province"
                        >
                            <option value="">All provinces</option>
                            {provinceNames.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>
                    <ul className="max-h-64 overflow-y-auto py-1 text-sm">
                        {matches.map((o) => (
                            <li key={`${o.province}|${o.name}`}>
                                <button
                                    type="button"
                                    className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left hover:bg-accent"
                                    onClick={() => pick(o)}
                                >
                                    <span>{o.name}</span>
                                    <span className="text-xs text-muted-foreground">{o.province}</span>
                                </button>
                            </li>
                        ))}
                        {matches.length === 0 && !canUseOwn && (
                            <li className="px-3 py-2 text-muted-foreground">No match. Type your own place.</li>
                        )}
                        {canUseOwn && (
                            <li className="border-t">
                                {province ? (
                                    <button
                                        type="button"
                                        className="w-full px-3 py-2 text-left font-medium text-ocean hover:bg-accent"
                                        onClick={() => pick({ province, name: own })}
                                    >
                                        Use “{own}” in {province}
                                    </button>
                                ) : (
                                    <p className="px-3 py-2 text-xs text-muted-foreground">
                                        To use “{own}” as your own place, choose its province above.
                                    </p>
                                )}
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
