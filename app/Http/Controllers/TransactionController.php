<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Transaction history" for passengers (what I paid) and drivers (what I earned),
 * plus the printable receipt for a single booking.
 */
class TransactionController extends Controller
{
    /** GET /transactions?view=spent|earned&status=&q=&from=&to= */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $f = $request->validate([
            'view' => ['nullable', 'in:spent,earned'],
            'status' => ['nullable', 'in:pending,paid,refunded,void'],
            'q' => ['nullable', 'string', 'max:40'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $view = $f['view'] ?? ($user->isDriver() ? 'earned' : 'spent');

        // Scope: payments whose booking belongs to me (as passenger) or whose ride I drive.
        $scope = fn (Builder $q) => $view === 'earned'
            ? $q->whereHas('booking.ride.vehicle', fn ($v) => $v->where('driver_id', $user->id))
            : $q->whereHas('booking', fn ($b) => $b->where('passenger_id', $user->id));

        $base = Payment::query()->tap($scope);

        $rows = (clone $base)
            ->with(['booking.ride.origin', 'booking.ride.destination', 'booking.passenger:id,name'])
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['q'] ?? null, function ($q, $v) {
                $like = '%'.addcslashes($v, '%_\\').'%';
                $q->where(fn ($w) => $w->where('receipt_no', 'like', $like)
                    ->orWhereHas('booking', fn ($b) => $b->where('reference_no', 'like', $like)));
            })
            ->when($f['from'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($f['to'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest()->paginate(12)->withQueryString();

        // Totals shown in the summary tiles (always across ALL my payments, not just this page).
        $sum = fn (PaymentStatus $s, string $col) => (float) (clone $base)->where('status', $s->value)->sum($col);
        $col = $view === 'earned' ? 'driver_earnings' : 'amount';

        return Inertia::render('transactions/index', [
            'view' => $view,
            'filters' => $f,
            'can_earn' => $user->isDriver(),
            'summary' => [
                'paid' => $sum(PaymentStatus::Paid, $col),
                'pending' => $sum(PaymentStatus::Pending, $col),
                'refunded' => $sum(PaymentStatus::Refunded, $col),
                'fees' => $view === 'earned' ? $sum(PaymentStatus::Paid, 'platform_fee') : null,
            ],
            'payments' => $rows->through(fn (Payment $p) => [
                'id' => $p->id,
                'booking_id' => $p->booking_id,
                'reference_no' => $p->booking->reference_no,
                'receipt_no' => $p->receipt_no,
                'route' => $p->booking->ride->origin->name.' → '.$p->booking->ride->destination->name,
                'counterpart' => $view === 'earned' ? $p->booking->passenger->name : null,
                'status' => $p->status->value,
                'method' => $p->method,
                'amount' => $p->amount,
                'platform_fee' => $p->platform_fee,
                'driver_earnings' => $p->driver_earnings,
                'paid_at' => $p->paid_at?->toIso8601String(),
                'created_at' => $p->created_at->toIso8601String(),
                'refund_reason' => $p->refund_reason,
            ]),
        ]);
    }

    /** GET /bookings/{booking}/receipt : printable receipt. Only for paid/refunded payments, only for participants/admin. */
    public function receipt(Request $request, Booking $booking): Response
    {
        $this->authorize('view', $booking);
        $booking->load(['payment', 'passenger:id,name,email', 'ride' => fn ($q) => $q->with(['origin', 'destination', 'vehicle.driver.user'])]);
        $payment = $booking->payment;

        abort_unless($payment && in_array($payment->status, [PaymentStatus::Paid, PaymentStatus::Refunded], true), 404);

        $isPassenger = $booking->passenger_id === $request->user()->id;

        return Inertia::render('transactions/receipt', [
            'receipt' => [
                'receipt_no' => $payment->receipt_no,
                'reference_no' => $booking->reference_no,
                'status' => $payment->status->value,
                'method' => $payment->method,
                'issued_at' => $payment->paid_at?->toIso8601String(),
                'refunded_at' => $payment->refunded_at?->toIso8601String(),
                'refund_reason' => $payment->refund_reason,
                'passenger' => $booking->passenger->name,
                'driver' => $booking->ride->vehicle->driver->user->name,
                'route' => $booking->ride->origin->name.' → '.$booking->ride->destination->name,
                'departure_at' => $booking->ride->departure_at->toIso8601String(),
                'seats' => $booking->seats_booked,
                'fare_per_seat' => $booking->fare_per_seat,
                'amount' => $payment->amount,
                // Passengers see what they paid; the fee split is for the driver and admin.
                'platform_fee' => $isPassenger ? null : $payment->platform_fee,
                'driver_earnings' => $isPassenger ? null : $payment->driver_earnings,
            ],
        ]);
    }
}
