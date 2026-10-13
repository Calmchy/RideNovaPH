// Small shared helpers so every page formats dates, money and statuses the same way.
// Colours come ONLY from the 5-colour palette (deep, ocean, coral, sand, foam): see resources/css/app.css.
import { cn } from '@/lib/utils';

export const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

export const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PH', { dateStyle: 'medium' });

export const peso = (amount: string | number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(Number(amount));

/** Value for <input type="datetime-local"> (local time, no seconds). */
export const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

const STATUS_STYLE: Record<string, string> = {
    // waiting for someone: warm sand
    pending: 'bg-sand/60 text-deep dark:text-sand',
    scheduled: 'bg-sand/60 text-deep dark:text-sand',
    open: 'bg-sand/60 text-deep dark:text-sand',
    // accepted / in progress: soft foam
    approved: 'bg-foam/70 text-deep dark:bg-foam/20 dark:text-foam',
    on_the_road: 'bg-foam/70 text-deep dark:bg-foam/20 dark:text-foam',
    active: 'bg-foam/70 text-deep dark:bg-foam/20 dark:text-foam',
    // agreed: ocean tint
    confirmed: 'bg-ocean/15 text-ocean dark:text-foam',
    // done / money in: solid ocean
    completed: 'bg-ocean text-white',
    paid: 'bg-ocean text-white',
    // problems: coral
    cancelled: 'bg-coral/20 text-coral-ink dark:text-coral',
    rejected: 'bg-coral/20 text-coral-ink dark:text-coral',
    suspended: 'bg-coral/20 text-coral-ink dark:text-coral',
    refunded: 'bg-coral/20 text-coral-ink dark:text-coral',
    void: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={cn(
                'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap capitalize',
                STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {status.replace(/_/g, ' ')}
        </span>
    );
}

export function Stars({ value }: { value: number }) {
    return (
        <span aria-label={`${value} out of 5 stars`} className="text-sand">
            {'★'.repeat(value)}
            <span className="text-muted-foreground/40">
                {'★'.repeat(5 - value)}
            </span>
        </span>
    );
}
