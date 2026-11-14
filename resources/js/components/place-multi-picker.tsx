// Pick several Philippine places (towns, whole provinces, or your own text). Same list as the From / To picker.
// The value is plain text ("Abuyog, Leyte; Tacloban City, Leyte; Samar") so it stores in one text column.
import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { inputCls } from '@/components/kit';
import type { Province } from '@/components/place-picker';

const SEP = '; ';
const MAX_SHOWN = 60;

type Option = { label: string; sub: string; province: string };

export const splitPlaces = (value: string): string[] =>
    value
        .split(';')
        .map((v) => v.trim())
        .filter(Boolean);

export function PlaceMultiPicker({
    value,
    onChange,
    places,
    maxLength = 255,
    placeholder = 'Search a town or province…',
}: {
    value: string;
    onChange: (v: string) => void;
    places: Province[];
    maxLength?: number;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [province, setProvince] = useState('');
    const box = useRef<HTMLDivElement>(null);
    const chosen = splitPlaces(value);

    const options = useMemo<Option[]>(
        () =>
            places.flatMap((p) => [
                { label: p.name, sub: 'Whole province', province: p.name },
                ...p.towns.map((t) => ({
                    label: `${t}, ${p.name}`,
                    sub: p.name,
                    province: p.name,
                })),
            ]),
        [places],
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
                (!q || o.label.toLowerCase().includes(q)),
        );
        list.sort(
            (a, b) =>
                Number(b.label.toLowerCase().startsWith(q)) -
                    Number(a.label.toLowerCase().startsWith(q)) ||
                a.label.localeCompare(b.label),
        );

        return list.slice(0, MAX_SHOWN);
    }, [options, province, q]);

    const commit = (next: string[]) => {
        const text = next.join(SEP);

        if (text.length <= maxLength) {
            onChange(text);
        }
    };

    const add = (label: string) => {
        const clean = label.replace(/;/g, ' ').replace(/\s+/g, ' ').trim();

        if (
            clean &&
            !chosen.some((c) => c.toLowerCase() === clean.toLowerCase())
        ) {
            commit([...chosen, clean]);
        }

        setQuery('');
    };

    const own = query.trim();
    const canUseOwn =
        own.length >= 2 &&
        !options.some((o) => o.label.toLowerCase() === own.toLowerCase());

    return (
        <div ref={box} className="relative grid gap-2">
            {chosen.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                    {chosen.map((c) => (
                        <li
                            key={c}
                            className="flex items-center gap-1 rounded-full bg-foam/60 py-0.5 pr-1 pl-3 text-sm font-medium text-deep"
                        >
                            {c}
                            <button
                                type="button"
                                aria-label={`Remove ${c}`}
                                className="rounded-full p-0.5 hover:bg-black/10"
                                onClick={() =>
                                    commit(chosen.filter((x) => x !== c))
                                }
                            >
                                <X className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <input
                className={inputCls}
                value={query}
                placeholder={chosen.length ? 'Add another place…' : placeholder}
                maxLength={80}
                autoComplete="off"
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
                            add(matches[0].label);
                        } else if (canUseOwn) {
                            add(own);
                        }
                    }
                }}
            />
            {open && (
                <div className="absolute top-full z-30 mt-1 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
                    <div className="border-b p-2">
                        <select
                            className={inputCls}
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                            aria-label="Province"
                        >
                            <option value="">All provinces</option>
                            {places.map((p) => (
                                <option key={p.name} value={p.name}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <ul className="max-h-64 overflow-y-auto py-1 text-sm">
                        {matches.map((o) => {
                            const picked = chosen.some(
                                (c) =>
                                    c.toLowerCase() === o.label.toLowerCase(),
                            );

                            return (
                                <li key={o.label}>
                                    <button
                                        type="button"
                                        disabled={picked}
                                        className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left hover:bg-accent disabled:opacity-40"
                                        onClick={() => add(o.label)}
                                    >
                                        <span>{o.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {picked ? 'Added' : o.sub}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                        {matches.length === 0 && !canUseOwn && (
                            <li className="px-3 py-2 text-muted-foreground">
                                No match. Type your own place.
                            </li>
                        )}
                        {canUseOwn && (
                            <li className="border-t">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-ocean hover:bg-accent"
                                    onClick={() => add(own)}
                                >
                                    <Plus className="size-4" /> Add “{own}”
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
