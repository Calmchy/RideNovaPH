// Printable receipt. "Print / save as PDF" uses the browser print dialog (print:hidden hides the chrome).
import { Head, Link } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { fmtDateTime, peso, StatusBadge } from '@/components/lux';
import { Button } from '@/components/ui/button';

type Props = {
    receipt: {
        receipt_no: string;
        reference_no: string;
        status: string;
        method: string;
        issued_at: string | null;
        refunded_at: string | null;
        refund_reason: string | null;
        passenger: string;
        driver: string;
        route: string;
        departure_at: string;
        seats: number;
        fare_per_seat: string;
        amount: string;
        platform_fee: string | null;
        driver_earnings: string | null;
    };
};

export default function Receipt({ receipt: r }: Props) {
    const rows: [string, string][] = [
        ['Reference', r.reference_no],
        ['Passenger', r.passenger],
        ['Driver', r.driver],
        ['Route', r.route],
        ['Departure', fmtDateTime(r.departure_at)],
        ['Payment method', 'Cash on ride'],
        ['Fare per seat', peso(r.fare_per_seat)],
        ['Seats', String(r.seats)],
    ];

    return (
        <>
            <Head title={`Receipt ${r.receipt_no}`} />
            <div className="mx-auto w-full max-w-xl p-4 md:p-8">
                <div className="mb-4 flex justify-between print:hidden">
                    <Link
                        href="/transactions"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Transactions
                    </Link>
                    <Button onClick={() => window.print()}>
                        <Printer /> Print / save as PDF
                    </Button>
                </div>

                <article className="rounded-2xl border bg-card p-8 shadow-sm print:border-0 print:shadow-none">
                    <header className="flex items-start justify-between border-b pb-4">
                        <div>
                            <p className="font-serif text-2xl">
                                RideNova<span className="text-ocean">PH</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Official trip receipt
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-mono text-sm">{r.receipt_no}</p>
                            {r.issued_at && (
                                <p className="text-xs text-muted-foreground">
                                    {fmtDateTime(r.issued_at)}
                                </p>
                            )}
                            <div className="mt-1">
                                <StatusBadge status={r.status} />
                            </div>
                        </div>
                    </header>

                    <dl className="my-5 grid gap-2 text-sm">
                        {rows.map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">{k}</dt>
                                <dd className="text-right">{v}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className="space-y-1.5 border-t pt-4 text-sm">
                        <div className="flex justify-between text-lg font-semibold">
                            <span>Total paid</span>
                            <span>{peso(r.amount)}</span>
                        </div>
                        {r.platform_fee && (
                            <div className="flex justify-between text-muted-foreground">
                                <span>Platform fee</span>
                                <span>{peso(r.platform_fee)}</span>
                            </div>
                        )}
                        {r.driver_earnings && (
                            <div className="flex justify-between text-muted-foreground">
                                <span>Driver earnings</span>
                                <span>{peso(r.driver_earnings)}</span>
                            </div>
                        )}
                    </div>

                    {r.status === 'refunded' && (
                        <p className="mt-4 rounded-lg bg-coral/15 p-3 text-sm">
                            Refunded
                            {r.refunded_at &&
                                ` on ${fmtDateTime(r.refunded_at)}`}
                            . Reason: {r.refund_reason}
                        </p>
                    )}
                    <p className="mt-6 text-center text-xs text-muted-foreground">
                        Thank you for riding with RideNovaPH.
                    </p>
                </article>
            </div>
        </>
    );
}
