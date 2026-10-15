<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ApprovalStatus;
use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\RideStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\DriverProfile;
use App\Models\IdentityDocument;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /** GET /admin : headline numbers, things waiting for the admin, and the last bookings. */
    public function index(): Response
    {
        $days = collect(range(6, 0))->map(fn ($i) => today()->subDays($i));
        $perDay = Booking::where('created_at', '>=', today()->subDays(6))->get(['created_at'])
            ->groupBy(fn ($b) => $b->created_at->toDateString());

        return Inertia::render('admin/index', [
            'stats' => [
                'users' => User::count(),
                'drivers' => DriverProfile::where('status', ApprovalStatus::Approved->value)->count(),
                'open_rides' => Ride::where('status', RideStatus::Open->value)->count(),
                'bookings' => Booking::count(),
                'revenue' => (float) Payment::where('status', PaymentStatus::Paid->value)->sum('platform_fee'),
                'gross' => (float) Payment::where('status', PaymentStatus::Paid->value)->sum('amount'),
            ],
            'queues' => [
                'ids' => IdentityDocument::where('status', ApprovalStatus::Pending->value)->count(),
                'drivers' => DriverProfile::where('status', ApprovalStatus::Pending->value)->count(),
                'pending_bookings' => Booking::where('status', BookingStatus::Pending->value)->count(),
            ],
            'chart' => $days->map(fn ($d) => [
                'label' => $d->format('D'),
                'count' => $perDay->get($d->toDateString(), collect())->count(),
            ])->values(),
            'recent' => Booking::with(['ride.origin', 'ride.destination', 'passenger:id,name', 'payment'])
                ->latest()->limit(8)->get()->map(fn (Booking $b) => [
                    'id' => $b->id,
                    'reference_no' => $b->reference_no,
                    'passenger' => $b->passenger->name,
                    'route' => $b->ride->origin->name.' → '.$b->ride->destination->name,
                    'status' => $b->status->value,
                    'amount' => $b->payment?->amount,
                ]),
        ]);
    }
}
