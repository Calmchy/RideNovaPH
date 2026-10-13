<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\User;
use App\Support\Csv;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Admin > Reports: a date-range summary (revenue, bookings, top routes and drivers) with CSV exports. */
class ReportController extends Controller
{
    /** GET /admin/reports?from=&to= (default: last 30 days) */
    public function index(Request $request): Response
    {
        [$from, $to] = $this->range($request);

        $paid = fn () => DB::table('payments')->where('status', PaymentStatus::Paid->value)
            ->whereBetween('paid_at', [$from->startOfDay(), $to->copy()->endOfDay()]);

        return Inertia::render('admin/reports', [
            'filters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'totals' => [
                'gross' => (float) $paid()->sum('amount'),
                'fees' => (float) $paid()->sum('platform_fee'),
                'driver_earnings' => (float) $paid()->sum('driver_earnings'),
                'bookings' => Booking::whereBetween('created_at', [$from->startOfDay(), $to->copy()->endOfDay()])->count(),
                'new_users' => User::whereBetween('created_at', [$from->startOfDay(), $to->copy()->endOfDay()])->count(),
            ],
            'revenue_by_day' => $paid()->selectRaw('date(paid_at) as day, sum(platform_fee) as fees, sum(amount) as gross')
                ->groupBy('day')->orderBy('day')->get(),
            'by_status' => Booking::whereBetween('created_at', [$from->startOfDay(), $to->copy()->endOfDay()])
                ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
            'top_routes' => DB::table('bookings')
                ->join('rides', 'rides.id', '=', 'bookings.ride_id')
                ->join('cities as o', 'o.id', '=', 'rides.origin_city_id')
                ->join('cities as d', 'd.id', '=', 'rides.destination_city_id')
                ->where('bookings.status', '!=', 'cancelled')
                ->whereBetween('bookings.created_at', [$from->startOfDay(), $to->copy()->endOfDay()])
                // Grouped by city ids and joined to a label in PHP: avoids string-concat SQL that differs between MySQL and SQLite.
                ->selectRaw('o.name as origin, d.name as destination, count(*) as bookings, sum(bookings.seats_booked) as seats')
                ->groupBy('o.id', 'o.name', 'd.id', 'd.name')->orderByDesc('bookings')->limit(5)->get()
                ->map(fn ($r) => ['route' => $r->origin.' → '.$r->destination, 'bookings' => (int) $r->bookings, 'seats' => (int) $r->seats]),
            'top_drivers' => DB::table('payments')
                ->join('bookings', 'bookings.id', '=', 'payments.booking_id')
                ->join('rides', 'rides.id', '=', 'bookings.ride_id')
                ->join('vehicles', 'vehicles.id', '=', 'rides.vehicle_id')
                ->join('users', 'users.id', '=', 'vehicles.driver_id')
                ->where('payments.status', PaymentStatus::Paid->value)
                ->whereBetween('payments.paid_at', [$from->startOfDay(), $to->copy()->endOfDay()])
                ->selectRaw('users.name as name, count(*) as trips, sum(payments.driver_earnings) as earned')
                ->groupBy('users.id', 'users.name')->orderByDesc('earned')->limit(5)->get(),
        ]);
    }

    /** GET /admin/reports/export/{type} : bookings | users (type is whitelisted by the route). */
    public function export(Request $request, string $type): StreamedResponse
    {
        [$from, $to] = $this->range($request);

        if ($type === 'users') {
            $rows = User::with('role')->whereBetween('created_at', [$from->startOfDay(), $to->copy()->endOfDay()])->lazy(200)
                ->map(fn ($u) => [$u->id, $u->name, $u->email, $u->role->name, $u->account_status->value, $u->created_at->toDateTimeString()]);

            return Csv::download("users-{$from->toDateString()}.csv", ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined'], $rows);
        }

        $rows = Booking::with(['passenger:id,name', 'ride.origin', 'ride.destination', 'payment'])
            ->whereBetween('created_at', [$from->startOfDay(), $to->copy()->endOfDay()])->lazy(200)
            ->map(fn ($b) => [
                $b->reference_no, $b->passenger->name, $b->ride->origin->name.' → '.$b->ride->destination->name,
                $b->seats_booked, $b->status->value, $b->payment?->status->value, $b->payment?->amount, $b->created_at->toDateTimeString(),
            ]);

        return Csv::download("bookings-{$from->toDateString()}.csv",
            ['Reference', 'Passenger', 'Route', 'Seats', 'Status', 'Payment', 'Amount', 'Created'], $rows);
    }

    /** Validated [from, to] as Carbon dates. */
    private function range(Request $request): array
    {
        $d = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from']]);

        return [
            \Illuminate\Support\Carbon::parse($d['from'] ?? now()->subDays(29))->startOfDay(),
            \Illuminate\Support\Carbon::parse($d['to'] ?? now())->startOfDay(),
        ];
    }
}
