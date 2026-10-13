<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Payments\RefundPayment;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Support\Csv;
use App\Support\Like;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Admin > Transactions: every payment, platform fees, driver earnings, refunds, CSV export. */
class TransactionController extends Controller
{
    /** Shared filter rules for the page and the export. */
    private function filters(Request $request): array
    {
        return $request->validate([
            'status' => ['nullable', 'in:pending,paid,refunded,void'],
            'q' => ['nullable', 'string', 'max:60'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
    }

    private function query(array $f): Builder
    {
        return Payment::query()
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['from'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($f['to'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('receipt_no', 'like', Like::contains($v))
                ->orWhereHas('booking', fn ($b) => $b->where('reference_no', 'like', Like::contains($v)))));
    }

    /** GET /admin/transactions */
    public function index(Request $request): Response
    {
        $f = $this->filters($request);
        $base = $this->query($f);
        $sum = fn (string $col, PaymentStatus $s) => (float) (clone $base)->where('status', $s->value)->sum($col);

        $rows = (clone $base)->with(['booking.ride.origin', 'booking.ride.destination', 'booking.passenger:id,name', 'booking.ride.vehicle.driver.user'])
            ->latest()->paginate(15)->withQueryString();

        return Inertia::render('admin/transactions', [
            'filters' => $f,
            'summary' => [
                'gross' => $sum('amount', PaymentStatus::Paid),
                'fees' => $sum('platform_fee', PaymentStatus::Paid),
                'driver_earnings' => $sum('driver_earnings', PaymentStatus::Paid),
                'refunded' => $sum('amount', PaymentStatus::Refunded),
                'pending' => $sum('amount', PaymentStatus::Pending),
            ],
            'payments' => $rows->through(fn (Payment $p) => [
                'id' => $p->id,
                'booking_id' => $p->booking_id,
                'reference_no' => $p->booking->reference_no,
                'receipt_no' => $p->receipt_no,
                'passenger' => $p->booking->passenger->name,
                'driver' => $p->booking->ride->vehicle->driver->user->name,
                'route' => $p->booking->ride->origin->name.' → '.$p->booking->ride->destination->name,
                'status' => $p->status->value,
                'amount' => $p->amount,
                'platform_fee' => $p->platform_fee,
                'driver_earnings' => $p->driver_earnings,
                'paid_at' => $p->paid_at?->toIso8601String(),
                'refund_reason' => $p->refund_reason,
            ]),
        ]);
    }

    /** POST /admin/transactions/{payment}/refund */
    public function refund(Request $request, Payment $payment, RefundPayment $refund): RedirectResponse
    {
        $reason = $request->validate(['reason' => ['required', 'string', 'max:255']])['reason'];
        $refund->handle($payment, $request->user(), $reason);
        $this->toast('Payment refunded.');

        return back();
    }

    /** GET /admin/transactions/export : CSV of whatever the filters currently show. */
    public function export(Request $request): StreamedResponse
    {
        $rows = (function () use ($request) {
            foreach ($this->query($this->filters($request))->with(['booking.passenger:id,name', 'booking.ride.vehicle.driver.user'])->latest()->lazy(200) as $p) {
                yield [
                    $p->receipt_no, $p->booking->reference_no, $p->booking->passenger->name,
                    $p->booking->ride->vehicle->driver->user->name, $p->status->value, $p->amount,
                    $p->platform_fee, $p->driver_earnings, $p->paid_at?->toDateTimeString(), $p->refund_reason,
                ];
            }
        })();

        return Csv::download('transactions-'.now()->format('Ymd').'.csv',
            ['Receipt', 'Booking', 'Passenger', 'Driver', 'Status', 'Amount', 'Platform fee', 'Driver earnings', 'Paid at', 'Refund reason'], $rows);
    }
}
