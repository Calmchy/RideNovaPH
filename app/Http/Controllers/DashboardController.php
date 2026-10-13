<?php

namespace App\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\Announcement;
use App\Models\Banner;
use App\Models\Booking;
use App\Models\DriverProfile;
use App\Models\Payment;
use App\Models\Ride;
use App\Enums\RideStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /** GET /dashboard : slideshow, role-aware stats, my trips and top drivers. */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $latestId = $user->identityDocuments()->latest()->first();

        $openStates = [BookingStatus::Pending->value, BookingStatus::Approved->value, BookingStatus::Confirmed->value];

        $upcoming = $user->bookings()->with(['ride.origin', 'ride.destination'])
            ->whereIn('status', $openStates)->latest()->limit(6)->get();

        // Driver-only numbers are null for passengers, so the page shows the passenger tile instead.
        $isDriver = $user->isDriver();
        $myRides = fn () => Ride::whereHas('vehicle', fn ($q) => $q->where('driver_id', $user->id));

        return Inertia::render('dashboard', [
            'slides' => $this->slides(),
            'id_status' => $latestId?->status->value,
            'stats' => [
                'upcoming' => $user->bookings()->whereIn('status', $openStates)->count(),
                'completed' => $user->bookings()->where('status', BookingStatus::Completed->value)->count(),
                'spent' => (float) Payment::whereHas('booking', fn ($q) => $q->where('passenger_id', $user->id))
                    ->where('status', PaymentStatus::Paid->value)->sum('amount'),
                'awaiting_my_approval' => Booking::whereHas('ride.vehicle', fn ($q) => $q->where('driver_id', $user->id))
                    ->where('status', BookingStatus::Pending->value)->count(),
                'earned' => $isDriver
                    ? (float) Payment::whereHas('booking.ride.vehicle', fn ($q) => $q->where('driver_id', $user->id))
                        ->where('status', PaymentStatus::Paid->value)->sum('driver_earnings')
                    : null,
                'active_rides' => $isDriver ? $myRides()->where('status', RideStatus::Open->value)->count() : null,
            ],
            'upcoming' => $upcoming->map(fn (Booking $b) => [
                'id' => $b->id,
                'reference_no' => $b->reference_no,
                'status' => $b->status->value,
                'route' => $b->ride->origin->name.' → '.$b->ride->destination->name,
                'departure_at' => $b->ride->departure_at->toIso8601String(),
            ]),
            'drivers' => $this->drivers(),
        ]);
    }

    /** Admin banners and upcoming exam announcements, interleaved into one auto-playing slideshow. */
    private function slides(): array
    {
        $banners = Banner::slideshow()->get()->map(fn (Banner $b) => [
            'key' => 'b'.$b->id,
            'tag' => 'Featured',
            'title' => $b->title,
            'caption' => $b->caption,
            'href' => $b->link_url ?: '/bookings?tab=find',
            'image_url' => str_starts_with($b->image_path, 'http') ? $b->image_path : Storage::disk('public')->url($b->image_path),
        ]);

        $notices = Announcement::upcoming()->with(['category', 'city'])->limit(5)->get()->map(fn (Announcement $a) => [
            'key' => 'a'.$a->id,
            'tag' => $a->category->name,
            'title' => $a->title,
            'caption' => collect([$a->city?->name, $a->exam_date?->format('M j, Y')])->filter()->implode(' · '),
            'href' => $a->city_id ? '/bookings?tab=find&destination='.$a->city_id : '/bookings?tab=find',
            'image_url' => null,
        ]);

        // Alternate banner / announcement so the show stays varied.
        $out = [];
        for ($i = 0, $n = max($banners->count(), $notices->count()); $i < $n; $i++) {
            foreach ([$banners[$i] ?? null, $notices[$i] ?? null] as $s) {
                if ($s) {
                    $out[] = $s;
                }
            }
        }

        return $out;
    }

    /** Top approved drivers with their passenger rating and next open ride. */
    private function drivers(): array
    {
        $ratings = DB::table('reviews')
            ->join('bookings', 'bookings.id', '=', 'reviews.booking_id')
            ->join('rides', 'rides.id', '=', 'bookings.ride_id')
            ->join('vehicles', 'vehicles.id', '=', 'rides.vehicle_id')
            ->where('reviews.reviewer_role', 'passenger')
            ->groupBy('vehicles.driver_id')
            ->selectRaw('vehicles.driver_id as driver_id, AVG(reviews.rating) as average, COUNT(*) as total')
            ->get()->keyBy('driver_id');

        return DriverProfile::with('user:id,name')
            ->where('status', ApprovalStatus::Approved->value)->limit(12)->get()
            ->map(function (DriverProfile $p) use ($ratings) {
                $r = $ratings->get($p->user_id);
                $next = Ride::with(['origin', 'destination'])->available()
                    ->whereHas('vehicle', fn ($q) => $q->where('driver_id', $p->user_id))
                    ->orderBy('departure_at')->first();

                return [
                    'id' => $p->user_id,
                    'name' => $p->user->name,
                    'rating' => $r ? round((float) $r->average, 1) : null,
                    'reviews' => $r ? (int) $r->total : 0,
                    'next_ride' => $next ? [
                        'id' => $next->id,
                        'route' => $next->origin->name.' → '.$next->destination->name,
                        'departure_at' => $next->departure_at->toIso8601String(),
                    ] : null,
                ];
            })
            ->sortByDesc(fn ($d) => $d['rating'] ?? 0)->take(5)->values()->all();
    }
}
