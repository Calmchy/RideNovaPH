// Admin > Settings: platform fee, cancellation cut-off, seat limit, ID rule, support email. Saved with PUT /admin/settings.
import { Head, useForm } from '@inertiajs/react';
import { Field, inputCls, PageHeader, Panel } from '@/components/kit';
import { fmtDateTime } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    settings: Record<string, string>;
    recent_activity: {
        id: number;
        action: string;
        actor: string | null;
        at: string;
    }[];
};

export default function AdminSettings({ settings, recent_activity }: Props) {
    const form = useForm({
        platform_fee_percent: settings.platform_fee_percent,
        cancellation_cutoff_hours: settings.cancellation_cutoff_hours,
        max_seats_per_booking: settings.max_seats_per_booking,
        max_active_bookings: settings.max_active_bookings,
        booking_min_gap_hours: settings.booking_min_gap_hours,
        cancel_strike_limit: settings.cancel_strike_limit,
        cancel_strike_days: settings.cancel_strike_days,
        cancellation_fee_percent: settings.cancellation_fee_percent,
        require_id_for_booking: settings.require_id_for_booking === '1',
        support_email: settings.support_email,
    });

    return (
        <>
            <Head title="Settings" />
            <PageHeader
                title="Settings"
                description="Rules the whole platform follows. Changes apply to new bookings; existing ones keep their snapshot."
            />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put('/admin/settings', { preserveScroll: true });
                }}
                className="grid max-w-3xl gap-6"
            >
                <Panel title="Money">
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <Field
                            label="Platform fee (%)"
                            hint="Share of each fare kept by RideNovaPH."
                            error={form.errors.platform_fee_percent}
                        >
                            <input
                                type="number"
                                min={0}
                                max={50}
                                step="0.5"
                                required
                                value={form.data.platform_fee_percent}
                                onChange={(e) =>
                                    form.setData(
                                        'platform_fee_percent',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Support email"
                            error={form.errors.support_email}
                        >
                            <input
                                type="email"
                                required
                                value={form.data.support_email}
                                onChange={(e) =>
                                    form.setData(
                                        'support_email',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </Panel>
                <Panel title="Bookings">
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <Field
                            label="Cancellation cut-off (hours)"
                            hint="Passengers can’t cancel closer to departure than this."
                            error={form.errors.cancellation_cutoff_hours}
                        >
                            <input
                                type="number"
                                min={0}
                                max={72}
                                required
                                value={form.data.cancellation_cutoff_hours}
                                onChange={(e) =>
                                    form.setData(
                                        'cancellation_cutoff_hours',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Max seats per booking"
                            error={form.errors.max_seats_per_booking}
                        >
                            <input
                                type="number"
                                min={1}
                                max={20}
                                required
                                value={form.data.max_seats_per_booking}
                                onChange={(e) =>
                                    form.setData(
                                        'max_seats_per_booking',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        <label className="flex items-start gap-3 text-sm sm:col-span-2">
                            <input
                                type="checkbox"
                                checked={form.data.require_id_for_booking}
                                onChange={(e) =>
                                    form.setData(
                                        'require_id_for_booking',
                                        e.target.checked,
                                    )
                                }
                                className="mt-1"
                            />
                            <span>
                                <span className="font-medium">
                                    Require an approved ID to book
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    Recommended: it is a core safety rule of
                                    RideNovaPH.
                                </span>
                            </span>
                        </label>
                    </div>
                </Panel>
                <Panel title="Abuse protection">
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <Field
                            label="Max open bookings per passenger"
                            hint="Pending, approved or confirmed at the same time. 0 = no limit."
                            error={form.errors.max_active_bookings}
                        >
                            <input
                                type="number"
                                min={0}
                                max={20}
                                required
                                value={form.data.max_active_bookings}
                                onChange={(e) =>
                                    form.setData(
                                        'max_active_bookings',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Min hours between two bookings"
                            hint="Stops one person holding rides that overlap. 0 = off."
                            error={form.errors.booking_min_gap_hours}
                        >
                            <input
                                type="number"
                                min={0}
                                max={48}
                                required
                                value={form.data.booking_min_gap_hours}
                                onChange={(e) =>
                                    form.setData(
                                        'booking_min_gap_hours',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Cancellations before a block"
                            hint="Booking pauses once reached. 0 = off."
                            error={form.errors.cancel_strike_limit}
                        >
                            <input
                                type="number"
                                min={0}
                                max={20}
                                required
                                value={form.data.cancel_strike_limit}
                                onChange={(e) =>
                                    form.setData(
                                        'cancel_strike_limit',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="…within this many days"
                            hint="The window for the cancellation count."
                            error={form.errors.cancel_strike_days}
                        >
                            <input
                                type="number"
                                min={1}
                                max={365}
                                required
                                value={form.data.cancel_strike_days}
                                onChange={(e) =>
                                    form.setData(
                                        'cancel_strike_days',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field
                            label="Cancellation fee (%)"
                            hint="Charged when a passenger cancels AFTER the driver approved. Pending requests cancel free."
                            error={form.errors.cancellation_fee_percent}
                        >
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step="1"
                                required
                                value={form.data.cancellation_fee_percent}
                                onChange={(e) =>
                                    form.setData(
                                        'cancellation_fee_percent',
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </Panel>
                <div>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving…' : 'Save settings'}
                    </Button>
                </div>
            </form>

            <Panel title="Recent admin activity" className="max-w-3xl">
                {recent_activity.length ? (
                    <ul className="divide-y text-sm">
                        {recent_activity.map((a) => (
                            <li
                                key={a.id}
                                className="flex justify-between gap-3 px-5 py-2.5"
                            >
                                <span>
                                    <span className="font-mono text-xs">
                                        {a.action}
                                    </span>{' '}
                                    · {a.actor ?? 'system'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {fmtDateTime(a.at)}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="p-5 text-sm text-muted-foreground">
                        Nothing yet.
                    </p>
                )}
            </Panel>
        </>
    );
}
