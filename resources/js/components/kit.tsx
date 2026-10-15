// Reusable page building blocks used by the admin, driver, bookings and transactions pages:
// headers, stat tiles, panels, pagination, a self-wiring filter bar and a "reason" dialog.
// Keeping them here means every list in the app searches, filters and pages the same way.
import { Link, router } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { RotateCcw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
import { cn } from '@/lib/utils';

// ---- shared class strings (one place to restyle every table / input) ----
export const inputCls =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30';
export const tableCls = 'w-full text-left text-sm';
export const thCls =
    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground';
export const tdCls = 'px-4 py-3 align-middle';

// ---- Laravel paginator shape (Inertia serialises paginate() like this) ----
export type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

export type SimplePaginated<T> = {
    data: T[];
    next_page_url: string | null;
    prev_page_url: string | null;
};

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
    );
}

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'ocean',
}: {
    label: string;
    value: ReactNode;
    hint?: string;
    icon?: LucideIcon;
    tone?: 'ocean' | 'coral' | 'sand' | 'foam' | 'deep';
}) {
    const toneCls = {
        ocean: 'bg-ocean/10 text-ocean',
        coral: 'bg-coral/15 text-coral-ink',
        sand: 'bg-sand/50 text-deep',
        foam: 'bg-foam/50 text-deep',
        deep: 'bg-deep text-foam',
    }[tone];

    return (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                {Icon && (
                    <span
                        className={cn(
                            'grid size-9 place-items-center rounded-xl',
                            toneCls,
                        )}
                    >
                        <Icon className="size-5" />
                    </span>
                )}
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
                {value}
            </p>
            {hint && (
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
        </div>
    );
}

export function Panel({
    title,
    actions,
    children,
    className,
}: {
    title?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn('rounded-2xl border bg-card shadow-sm', className)}
        >
            {(title || actions) && (
                <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
                    <h2 className="font-semibold">{title}</h2>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}

export function EmptyState({ children }: { children: ReactNode }) {
    return (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {children}
        </p>
    );
}

/** Numbered pager for paginate(). Laravel sends labels like "&laquo; Previous", so we tidy them. */
export function Pager({ page }: { page: Paginated<unknown> }) {
    if (page.links.length <= 3) {
        return page.total > 0 ? (
            <p className="px-1 pt-3 text-xs text-muted-foreground">
                {page.total} result{page.total === 1 ? '' : 's'}
            </p>
        ) : null;
    }

    return (
        <nav
            className="flex flex-wrap items-center justify-between gap-3 pt-4"
            aria-label="Pagination"
        >
            <p className="text-xs text-muted-foreground">
                {page.from}–{page.to} of {page.total}
            </p>
            <div className="flex flex-wrap gap-1">
                {page.links.map((l, i) => {
                    const label = l.label
                        .replace('&laquo; Previous', '‹ Prev')
                        .replace('Next &raquo;', 'Next ›');
                    const cls = cn(
                        'min-w-9 rounded-lg border px-3 py-1.5 text-center text-xs',
                        l.active
                            ? 'border-ocean bg-ocean text-white'
                            : 'bg-card hover:bg-muted',
                        !l.url && 'pointer-events-none opacity-40',
                    );

                    return l.url ? (
                        <Link
                            key={i}
                            href={l.url}
                            preserveScroll
                            preserveState
                            className={cls}
                        >
                            {label}
                        </Link>
                    ) : (
                        <span key={i} className={cls}>
                            {label}
                        </span>
                    );
                })}
            </div>
        </nav>
    );
}

/** Prev / next for simplePaginate() (the ride finder). */
export function SimplePager({ page }: { page: SimplePaginated<unknown> }) {
    if (!page.next_page_url && !page.prev_page_url) {
        return null;
    }

    return (
        <div className="flex justify-center gap-2 pt-6">
            {page.prev_page_url && (
                <Button asChild variant="outline">
                    <Link href={page.prev_page_url} preserveScroll>
                        ‹ Previous
                    </Link>
                </Button>
            )}
            {page.next_page_url && (
                <Button asChild variant="outline">
                    <Link href={page.next_page_url} preserveScroll>
                        Next ›
                    </Link>
                </Button>
            )}
        </div>
    );
}

export type FilterField = {
    name: string;
    type: 'search' | 'select' | 'date';
    placeholder?: string;
    options?: { value: string | number; label: string }[];
    label?: string;
};

/**
 * One search/filter bar for any list page. It keeps its own state, sends a GET request to `url`
 * (debounced for typing, instant for selects and dates), and `extra` params (like ?tab=) are always kept.
 * The server validates every filter again, so nothing here is trusted.
 */
export function FilterBar({
    url,
    values,
    fields,
    extra = {},
}: {
    url: string;
    values: Record<string, unknown>;
    fields: FilterField[];
    extra?: Record<string, string>;
}) {
    const [state, setState] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            fields.map((f) => [f.name, String(values[f.name] ?? '')]),
        ),
    );
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const extraRef = useRef(extra);

    useEffect(() => {
        extraRef.current = extra;
    });
    useEffect(() => () => clearTimeout(timer.current), []);

    const go = (next: Record<string, string>) => {
        const query = {
            ...extraRef.current,
            ...Object.fromEntries(
                Object.entries(next).filter(([, v]) => v !== ''),
            ),
        };
        router.get(url, query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const update = (name: string, value: string, debounce: boolean) => {
        const next = { ...state, [name]: value };
        setState(next);
        clearTimeout(timer.current);

        if (debounce) {
            timer.current = setTimeout(() => go(next), 350);
        } else {
            go(next);
        }
    };

    const dirty = Object.values(state).some((v) => v !== '');

    return (
        <form
            role="search"
            onSubmit={(e) => {
                e.preventDefault();
                clearTimeout(timer.current);
                go(state);
            }}
            className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4"
        >
            {fields.map((f) => (
                <label
                    key={f.name}
                    className={cn(
                        'grid gap-1 text-xs text-muted-foreground',
                        f.type === 'search' ? 'min-w-56 flex-1' : 'min-w-36',
                    )}
                >
                    {f.label ??
                        (f.type === 'search' ? 'Search' : f.placeholder)}
                    {f.type === 'search' ? (
                        <span className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="search"
                                value={state[f.name]}
                                placeholder={f.placeholder}
                                onChange={(e) =>
                                    update(f.name, e.target.value, true)
                                }
                                className={cn(inputCls, 'pl-9')}
                            />
                        </span>
                    ) : f.type === 'select' ? (
                        <select
                            value={state[f.name]}
                            onChange={(e) =>
                                update(f.name, e.target.value, false)
                            }
                            className={inputCls}
                        >
                            <option value="">{f.placeholder ?? 'All'}</option>
                            {f.options?.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="date"
                            value={state[f.name]}
                            onChange={(e) =>
                                update(f.name, e.target.value, false)
                            }
                            className={inputCls}
                        />
                    )}
                </label>
            ))}
            {dirty && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                        const empty = Object.fromEntries(
                            fields.map((f) => [f.name, '']),
                        );
                        setState(empty);
                        go(empty);
                    }}
                >
                    <RotateCcw /> Reset
                </Button>
            )}
        </form>
    );
}

/** Confirmation dialog, optionally collecting a reason (required for rejections, refunds, cancellations). */
export function ReasonDialog({
    trigger,
    title,
    description,
    confirmLabel = 'Confirm',
    askReason = true,
    reasonRequired = false,
    reasonLabel = 'Reason',
    destructive = false,
    onConfirm,
}: {
    trigger: ReactNode;
    title: string;
    description?: string;
    confirmLabel?: string;
    askReason?: boolean;
    reasonRequired?: boolean;
    reasonLabel?: string;
    destructive?: boolean;
    onConfirm: (reason: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                {askReason && (
                    <label className="grid gap-1 text-sm">
                        {reasonLabel}
                        {reasonRequired ? ' (required)' : ' (optional)'}
                        <textarea
                            value={reason}
                            maxLength={255}
                            rows={3}
                            onChange={(e) => setReason(e.target.value)}
                            className={inputCls}
                        />
                    </label>
                )}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                    >
                        Back
                    </Button>
                    <Button
                        type="button"
                        variant={destructive ? 'destructive' : 'default'}
                        disabled={askReason && reasonRequired && !reason.trim()}
                        onClick={() => {
                            onConfirm(reason.trim());
                            setOpen(false);
                            setReason('');
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Label + input + error wrapper for forms built with useForm(). */
export function Field({
    label,
    error,
    hint,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{label}</span>
            {children}
            {hint && !error && (
                <span className="text-xs text-muted-foreground">{hint}</span>
            )}
            {error && <span className="text-xs text-destructive">{error}</span>}
        </label>
    );
}
