// Calendar picker that replaces the browser's date / date-time inputs so days can be colour-coded:
//   red   = already passed (not available)
//   green = available
//   blue  = today
// Values use the same strings as <input type="date"> ("2026-11-15") and
// <input type="datetime-local"> ("2026-11-15T14:30"), so forms keep working unchanged.
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Same look as the other form inputs (kept here so this file doesn't import kit.tsx, which imports it).
const inputCls =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30';

type Props = {
    value: string;
    onChange: (value: string) => void;
    /** Earliest allowed moment ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"). Earlier days are red and cannot be picked. */
    min?: string;
    /** Latest allowed day. Later days are greyed out. */
    max?: string;
    /** Also pick a time of day (value becomes "YYYY-MM-DDTHH:mm"). */
    withTime?: boolean;
    /** Passed days are still red, but can be chosen (e.g. when searching old rides). */
    allowPast?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
};

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** "2026-11-15T14:30" / "2026-11-15" -> parts (local time, no timezone maths). */
function parse(v?: string) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v ?? '');

    if (!m) {
        return null;
    }

    return {
        y: +m[1],
        m: +m[2] - 1,
        d: +m[3],
        h: m[4] ? +m[4] : null,
        min: m[5] ? +m[5] : null,
    };
}

const POPUP_W = 304;

export function DatePicker({
    value,
    onChange,
    min,
    max,
    withTime = false,
    allowPast = false,
    disabled,
    placeholder,
    className,
}: Props) {
    const [open, setOpen] = useState(false);
    const btn = useRef<HTMLButtonElement>(null);
    const pop = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const now = new Date();
    const today = ymd(now.getFullYear(), now.getMonth(), now.getDate());
    const sel = parse(value);
    const lo = parse(min);
    const hi = parse(max);
    const loDay = lo ? ymd(lo.y, lo.m, lo.d) : null;
    const hiDay = hi ? ymd(hi.y, hi.m, hi.d) : null;

    // Month on screen: the chosen day, else the earliest allowed day, else this month.
    const start = sel ?? lo ?? { y: now.getFullYear(), m: now.getMonth() };
    const [view, setView] = useState({ y: start.y, m: start.m });

    const place = useCallback(() => {
        const r = btn.current?.getBoundingClientRect();

        if (!r) {
            return;
        }

        const height = pop.current?.offsetHeight ?? 380;
        const below = window.innerHeight - r.bottom;
        const top =
            below < height + 12 && r.top > height + 12
                ? r.top - height - 6
                : r.bottom + 6;
        const left = Math.max(
            8,
            Math.min(r.left, window.innerWidth - POPUP_W - 8),
        );
        setPos({ top: Math.max(8, top), left });
    }, []);

    useLayoutEffect(() => {
        if (open) {
            place();
        }
    }, [open, place, view]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const close = (e: MouseEvent) => {
            const t = e.target as Node;

            if (!pop.current?.contains(t) && !btn.current?.contains(t)) {
                setOpen(false);
            }
        };
        const key = (e: KeyboardEvent) =>
            e.key === 'Escape' && (setOpen(false), btn.current?.focus());
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', key);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', key);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, place]);

    const cells = useMemo(() => {
        const first = new Date(view.y, view.m, 1).getDay();
        const days = new Date(view.y, view.m + 1, 0).getDate();

        return [
            ...Array(first).fill(null),
            ...Array.from({ length: days }, (_, i) => i + 1),
        ] as (number | null)[];
    }, [view]);

    const time = {
        h: sel?.h ?? null,
        min: sel?.min ?? null,
    };

    /** Smallest time allowed on `day` (only matters when min carries a time and the day is min's day). */
    const floorFor = (day: string) =>
        withTime && lo && lo.h !== null && loDay === day
            ? lo.h * 60 + (lo.min ?? 0)
            : 0;

    const emit = (day: string, minutes: number | null) => {
        if (!withTime) {
            onChange(day);

            return;
        }

        // Default time: the earliest allowed that day (rounded up to 5 min), else 8:00 AM.
        const floor = floorFor(day);
        const base =
            minutes ??
            Math.max(floor ? Math.ceil(floor / 5) * 5 : 8 * 60, floor);
        const clamped = Math.min(Math.max(base, floor), 23 * 60 + 59);
        onChange(
            `${day}T${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`,
        );
    };

    const pickDay = (d: number) => {
        const day = ymd(view.y, view.m, d);
        emit(day, time.h !== null ? time.h * 60 + (time.min ?? 0) : null);

        if (!withTime) {
            setOpen(false);
        }
    };

    const setTime = (h12: number, minute: number, pm: boolean) => {
        if (!sel) {
            return;
        }

        const h = (h12 % 12) + (pm ? 12 : 0);
        emit(ymd(sel.y, sel.m, sel.d), h * 60 + minute);
    };

    const h24 = time.h ?? 8;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const pm = h24 >= 12;
    const minute = time.min ?? 0;
    const minuteOptions = [
        ...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), minute]),
    ].sort((a, b) => a - b);

    const label = sel
        ? new Date(sel.y, sel.m, sel.d).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          }) +
          (withTime && sel.h !== null
              ? `, ${pad(h12)}:${pad(minute)} ${pm ? 'PM' : 'AM'}`
              : '')
        : '';

    const selDay = sel ? ymd(sel.y, sel.m, sel.d) : null;

    return (
        <>
            <button
                ref={btn}
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!open) {
                        setView({ y: start.y, m: start.m });
                    }

                    setOpen((o) => !o);
                }}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={cn(
                    inputCls,
                    'flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60',
                    className,
                )}
            >
                <span className={label ? '' : 'text-muted-foreground'}>
                    {label ||
                        placeholder ||
                        (withTime ? 'Pick date & time' : 'Pick a date')}
                </span>
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            </button>

            {open &&
                createPortal(
                    <div
                        ref={pop}
                        role="dialog"
                        aria-label="Choose a date"
                        style={{
                            position: 'fixed',
                            top: pos.top,
                            left: pos.left,
                            width: POPUP_W,
                        }}
                        className="z-[100] rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl"
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <button
                                type="button"
                                aria-label="Previous month"
                                onClick={() =>
                                    setView((v) =>
                                        v.m === 0
                                            ? { y: v.y - 1, m: 11 }
                                            : { y: v.y, m: v.m - 1 },
                                    )
                                }
                                className="rounded-md p-1.5 hover:bg-muted"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="text-sm font-semibold">
                                {MONTHS[view.m]} {view.y}
                            </span>
                            <button
                                type="button"
                                aria-label="Next month"
                                onClick={() =>
                                    setView((v) =>
                                        v.m === 11
                                            ? { y: v.y + 1, m: 0 }
                                            : { y: v.y, m: v.m + 1 },
                                    )
                                }
                                className="rounded-md p-1.5 hover:bg-muted"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
                            {WEEK.map((w) => (
                                <span key={w}>{w}</span>
                            ))}
                        </div>

                        <div className="mt-1 grid grid-cols-7 gap-1">
                            {cells.map((d, i) => {
                                if (d === null) {
                                    return <span key={`e${i}`} />;
                                }

                                const day = ymd(view.y, view.m, d);
                                const isToday = day === today;
                                const passed =
                                    day < today ||
                                    (loDay !== null && day < loDay);
                                const tooLate = hiDay !== null && day > hiDay;
                                const blocked =
                                    tooLate ||
                                    (passed && !isToday && !allowPast);
                                const chosen = day === selDay;

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        disabled={blocked}
                                        onClick={() => pickDay(d)}
                                        aria-label={`${MONTHS[view.m]} ${d}, ${view.y}${isToday ? ' (today)' : passed ? ' (passed)' : ''}`}
                                        aria-pressed={chosen}
                                        className={cn(
                                            'h-9 rounded-md text-sm font-medium transition',
                                            isToday
                                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                                : passed
                                                  ? 'bg-red-500/20 text-red-600 dark:bg-red-500/25 dark:text-red-300'
                                                  : tooLate
                                                    ? 'text-muted-foreground/40'
                                                    : 'bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/35 dark:bg-emerald-500/25 dark:text-emerald-300',
                                            blocked && 'cursor-not-allowed',
                                            chosen &&
                                                'ring-2 ring-foreground ring-offset-1 ring-offset-popover',
                                        )}
                                    >
                                        {d}
                                    </button>
                                );
                            })}
                        </div>

                        {withTime && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                                <span className="text-xs text-muted-foreground">
                                    Time
                                </span>
                                <select
                                    disabled={!sel}
                                    value={h12}
                                    onChange={(e) =>
                                        setTime(+e.target.value, minute, pm)
                                    }
                                    className="rounded-md border border-input bg-background px-2 py-1 disabled:opacity-50"
                                    aria-label="Hour"
                                >
                                    {Array.from(
                                        { length: 12 },
                                        (_, i) => i + 1,
                                    ).map((h) => (
                                        <option key={h} value={h}>
                                            {pad(h)}
                                        </option>
                                    ))}
                                </select>
                                :
                                <select
                                    disabled={!sel}
                                    value={minute}
                                    onChange={(e) =>
                                        setTime(h12, +e.target.value, pm)
                                    }
                                    className="rounded-md border border-input bg-background px-2 py-1 disabled:opacity-50"
                                    aria-label="Minute"
                                >
                                    {minuteOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {pad(m)}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    disabled={!sel}
                                    value={pm ? 'PM' : 'AM'}
                                    onChange={(e) =>
                                        setTime(
                                            h12,
                                            minute,
                                            e.target.value === 'PM',
                                        )
                                    }
                                    className="rounded-md border border-input bg-background px-2 py-1 disabled:opacity-50"
                                    aria-label="AM or PM"
                                >
                                    <option>AM</option>
                                    <option>PM</option>
                                </select>
                            </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                                <i className="size-2.5 rounded-sm bg-red-500" />{' '}
                                Passed
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <i className="size-2.5 rounded-sm bg-emerald-500" />{' '}
                                Available
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <i className="size-2.5 rounded-sm bg-blue-600" />{' '}
                                Today
                            </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                                className="text-xs text-muted-foreground underline hover:text-foreground"
                            >
                                Clear
                            </button>
                            {withTime && (
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
