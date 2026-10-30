<?php

namespace App\Http\Controllers;

use App\Actions\Bookings\ReserveSeat;
use App\Actions\Bookings\TransitionBooking;
use App\Actions\Payments\CollectPayment;
use App\Actions\Tracking\RecordLocation;
use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\RideStatus;
use App\Http\Requests\StoreBookingRequest;
use App\Models\Booking;
use App\Models\City;
use App\Models\Ride;
use App\Models\Setting;
use App\Support\PartnerProfile;
use App\Support\RidePresenter;
use App\Support\DriverReviews;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The single "Bookings" area: find a ride, reserve (Review & Reserve form),
 * manage my reservations, and (for drivers) answer incoming requests.
 */
class BookingController extends Controller
{
    /** Which policy ability and target status each URL action maps to. */
    private const ACTIONS = [
        'approve' => BookingStatus::Approved,
        'confirm' => BookingStatus::Confirmed,
        'complete' => BookingStatus::Completed,
        'cancel' => BookingStatus::Cancelled,
    ];

    /**
     * GET /bookings?tab=find|mine|requests
     * One page, three tabs, every filter validated then bound by Eloquent (no raw SQL from input).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = $request->validate([
            'tab' => ['nullable', 'in:find,mine,requests'],
            'origin' => ['nullable', 'integer', 'exists:cities,id'],
            'destination' => ['nullable', 'integer', 'exists:cities,id'],
            'date' => ['nullable', 'date'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'sort' => ['nullable', 'in:soonest,cheapest'],
            'status' => ['nullable', 'in:pending,approved,confirmed,completed,cancelled'],
            'q' => ['nullable', 'string', 'max:40'],
        ]);
        $tab = $filters['tab'] ?? 'find';
        abort_if($tab === 'requests' && ! $user->isDriver(), 404);

        $props = ['tab' => $tab, 'filters' => $filters, 'is_driver' => $user->isDriver()];

        if ($tab === 'find') {
            $rides = Ride::with(RidePresenter::WITH)
                ->available()->withSeatsLeft()
                // Don't offer a driver their own rides.
                ->whereDoesntHave('vehicle', fn ($q) => $q->where('driver_id', $user->id))
                ->when($filters['origin'] ?? null, fn ($q, $v) => $q->where('origin_city_id', $v))
                ->when($filters['destination'] ?? null, fn ($q, $v) => $q->where('destination_city_id', $v))
                ->when($filters['date'] ?? null, fn ($q, $v) => $q->whereDate('departure_at', $v))
                ->when($filters['max_price'] ?? null, fn ($q, $v) => $q->where('price_per_seat', '<=', $v))
                ->when(($filters['sort'] ?? 'soonest') === 'cheapest', fn ($q) => $q->orderBy('price_per_seat'))
                ->orderBy('departure_at')
                ->simplePaginate(9)->withQueryString();

            $props += [
                'rides' => $rides->through(fn (Ride $r) => RidePresenter::card($r, withDriverContact: true)),
                // Province comes along so the From / To boxes can search by town OR province.
                'cities' => City::with('province:id,name')->orderBy('name')->get(['id', 'name', 'province_id'])
                    ->map(fn (City $c) => ['id' => $c->id, 'name' => $c->name, 'province' => $c->province?->name]),
            ];
        } elseif ($tab === 'mine') {
            $mine = $user->bookings()->with(['ride.origin', 'ride.destination', 'payment'])
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->when($filters['q'] ?? null, fn ($q, $v) => $q->where('reference_no', 'like', '%'.addcslashes($v, '%_\\').'%'))
                ->latest()->paginate(10)->withQueryString();

            $props += ['bookings' => $mine->through(fn (Booking $b) => $this->summary($b))];
        } else {
            $requests = Booking::whereHas('ride.vehicle', fn ($q) => $q->where('driver_id', $user->id))
                ->with(['ride.origin', 'ride.destination', 'passenger:id,name', 'payment'])
                ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
                ->when($filters['q'] ?? null, fn ($q, $v) => $q->where('reference_no', 'like', '%'.addcslashes($v, '%_\\').'%'))
                ->latest()->paginate(10)->withQueryString();

            $props += ['bookings' => $requests->through(fn (Booking $b) => $this->summary($b) + ['passenger' => $b->passenger->name])];
        }

        $props['pending_requests'] = $user->isDriver()
            ? Booking::whereHas('ride.vehicle', fn ($q) => $q->where('driver_id', $user->id))
                ->where('status', BookingStatus::Pending->value)->count()
            : 0;

        return Inertia::render('bookings/index', $props);
    }

    /** GET /rides/{ride}/book : the "Review & Reserve" form. Every guard explains itself with a message. */
    public function create(Request $request, Ride $ride): Response|RedirectResponse
    {
        $user = $request->user();
        $ride->load([...RidePresenter::WITH]);

        if ($existing = $user->bookings()->where('ride_id', $ride->id)->first()) {
            return to_route('bookings.show', $existing);
        }

        if ($ride->vehicle->driver_id === $user->id) {
            $this->toast("You can't book your own ride.", 'error');

            return to_route('bookings.index');
        }

        if (Setting::bool('require_id_for_booking') && ! $user->hasApprovedId()) {
            $this->toast('Verify your ID first, then you can reserve a seat.', 'warning');

            return to_route('identity.create');
        }

        if ($ride->status !== RideStatus::Open || $ride->departure_at->isPast() || $ride->started_at || $ride->seatsLeft() < 1) {
            $this->toast('This ride is no longer available.', 'error');

            return to_route('bookings.index');
        }

        return Inertia::render('bookings/create', [
            'ride' => RidePresenter::card($ride) + [
                'origin_coords' => RidePresenter::coords($ride->origin),
                'destination_coords' => RidePresenter::coords($ride->destination),
            ],
            'prefill' => [
                'contact_name' => $user->name,
                'contact_email' => $user->email,
                'contact_phone' => $user->phone_number,
                'contact_address' => $user->address,
            ],
            'max_seats' => min(Setting::int('max_seats_per_booking'), $ride->seatsLeft()),
            'cutoff_hours' => Setting::int('cancellation_cutoff_hours'),
        ]);
    }

    /** POST /rides/{ride}/book : the reservation (status = pending). All business rules live in ReserveSeat. */
    public function store(StoreBookingRequest $request, Ride $ride, ReserveSeat $reserve): RedirectResponse
    {
        $data = $request->validated();

        $booking = $reserve->handle(
            $request->user(),
            $ride,
            (int) $data['seats'],
            Arr::except($data, ['seats', 'agree']),
        );

        $this->toast("Seat requested. Your reference number is {$booking->reference_no}.");

        return to_route('bookings.show', $booking);
    }

    /** GET /bookings/{booking} : reference number, status timeline, trip details, payment, actions, reviews. */
    public function show(Request $request, Booking $booking): Response
    {
        $this->authorize('view', $booking);
        $user = $request->user();
        $booking->load(['ride' => fn ($q) => $q->with(RidePresenter::WITH), 'passenger:id,name,phone_number,created_at', 'reviews', 'payment']);
        $role = $booking->roleOf($user); // passenger | driver | null (admin)

        return Inertia::render('bookings/show', [
            'booking' => $this->summary($booking) + [
                'passenger' => $booking->passenger->name,
                'driver' => $booking->ride->vehicle->driver->user->name,
                'vehicle' => $booking->ride->vehicle->model->make->name.' '.$booking->ride->vehicle->model->name.' · '.$booking->ride->vehicle->color,
                'plate_number' => $booking->ride->vehicle->plate_number,
                'pickup_point' => $booking->ride->pickup_point,
                'trip_status' => $booking->ride->tripStatus(),
                'approved_at' => $booking->approved_at?->toIso8601String(),
                'confirmed_at' => $booking->confirmed_at?->toIso8601String(),
                'completed_at' => $booking->completed_at?->toIso8601String(),
                'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
                'details' => [
                    'name' => $booking->contact_name,
                    'address' => $booking->contact_address,
                    'email' => $booking->contact_email,
                    'phone' => $booking->contact_phone,
                    'pickup_location' => $booking->pickup_location,
                    'pickup_lat' => $booking->pickup_lat,
                    'pickup_lng' => $booking->pickup_lng,
                    'pickup_at' => $booking->pickup_at?->toIso8601String(),
                    'return_location' => $booking->return_location,
                    'return_lat' => $booking->return_lat,
                    'return_lng' => $booking->return_lng,
                    'return_at' => $booking->return_at?->toIso8601String(),
                ],
                'payment' => $booking->payment ? [
                    'status' => $booking->payment->status->value,
                    'method' => $booking->payment->method,
                    'amount' => $booking->payment->amount,
                    'platform_fee' => $booking->payment->platform_fee,
                    'driver_earnings' => $booking->payment->driver_earnings,
                    'receipt_no' => $booking->payment->receipt_no,
                    'paid_at' => $booking->payment->paid_at?->toIso8601String(),
                    'refund_reason' => $booking->payment->refund_reason,
                    'cancellation_fee' => $booking->payment->cancellation_fee,
                    'fee_status' => $booking->payment->fee_status,
                ] : null,
                // What cancelling would cost the passenger RIGHT NOW (shown in the confirm dialog).
                'cancel_fee' => TransitionBooking::feeFor($booking),
                'cancel_fee_percent' => Setting::float('cancellation_fee_percent'),
                // Each review carries its author (name shown with an avatar). Only the two people on
                // this booking (and admins) can open this page, so full names are fine here.
                'reviews' => $booking->reviews->map(fn ($r) => [
                    'id' => $r->id,
                    'by' => $r->reviewer_role->value,
                    'name' => $r->reviewer_role->value === 'passenger'
                        ? $booking->passenger->name
                        : $booking->ride->vehicle->driver->user->name,
                    'rating' => $r->rating,
                    'comment' => $r->comment,
                    'at' => $r->created_at?->toIso8601String(),
                ]),
            ],
            // Live GPS panel: only for the two people on the trip, only while the booking is confirmed
            // and the tracking window is open. The JSON itself is served by TrackingController.
            'tracking' => $role && $booking->status === BookingStatus::Confirmed && RecordLocation::windowOpen($booking->ride)
                ? ['ride_id' => $booking->ride_id, 'role' => $role]
                : null,
            // The OTHER person's safe profile (driver for the passenger, passenger for the driver).
            // Admins are neither party, so they get none here (they have the admin user pages).
            'partner' => $role ? PartnerProfile::for($booking, $role) : null,
            // Ratings panel (public info about the driver of this trip).
            'driver_reviews' => [
                'driver_id' => $booking->ride->vehicle->driver_id,
                'summary' => DriverReviews::summary($booking->ride->vehicle->driver_id),
                'list' => DriverReviews::for($booking->ride->vehicle->driver_id, 5),
            ],
            'viewer_role' => $role ?? ($user->isAdmin() ? 'admin' : null),
            // Only offer buttons the policy would actually allow. The server re-checks on every request.
            'abilities' => collect(array_keys(self::ACTIONS))
                ->mapWithKeys(fn ($a) => [$a => $user->can($a, $booking) && $this->legal($booking, $a)])
                ->all() + [
                    'review' => $user->can('review', $booking),
                    // Driver's "Mark as paid": only while the money is still outstanding on a live booking.
                    'collect' => $user->can('collect', $booking)
                        && in_array($booking->status, [BookingStatus::Approved, BookingStatus::Confirmed], true)
                        && $booking->payment?->status === PaymentStatus::Pending,
                ],
        ]);
    }

    /** PATCH /bookings/{booking}/paid : the driver confirms the passenger handed over the cash. */
    public function collect(Request $request, Booking $booking, CollectPayment $collect): RedirectResponse
    {
        $this->authorize('collect', $booking->loadMissing('ride.vehicle'));

        $collect->handle($booking, $request->user());

        $this->toast('Payment recorded. Receipt issued.');

        return back();
    }

    /** PATCH /bookings/{booking}/{action} : approve | confirm | complete | cancel. */
    public function transition(Request $request, Booking $booking, string $action, TransitionBooking $transition): RedirectResponse
    {
        abort_unless(isset(self::ACTIONS[$action]), 404);
        $this->authorize($action, $booking->loadMissing('ride.vehicle'));

        $reason = $action === 'cancel'
            ? $request->validate(['reason' => ['required', 'string', 'min:5', 'max:255']])['reason']
            : null;

        $transition->handle($booking, self::ACTIONS[$action], $reason, $request->user());

        $this->toast('Booking updated.');

        return back();
    }

    /** Is this action legal from the booking's CURRENT status? (UI hint only; TransitionBooking is the authority.) */
    private function legal(Booking $booking, string $action): bool
    {
        return match ($action) {
            'approve' => $booking->status === BookingStatus::Pending,
            'confirm' => $booking->status === BookingStatus::Approved,
            'complete' => $booking->status === BookingStatus::Confirmed,
            // No cancel button once the booking is paid (the server enforces this too).
            'cancel' => in_array($booking->status, [BookingStatus::Pending, BookingStatus::Approved, BookingStatus::Confirmed], true)
                && $booking->payment?->status !== PaymentStatus::Paid,
        };
    }

    private function summary(Booking $b): array
    {
        return [
            'id' => $b->id,
            'reference_no' => $b->reference_no,
            'status' => $b->status->value,
            'seats' => $b->seats_booked,
            'total_fare' => $b->totalFare(),
            'route' => $b->ride->origin->name.' → '.$b->ride->destination->name,
            'departure_at' => $b->ride->departure_at->toIso8601String(),
            'cancellation_reason' => $b->cancellation_reason,
            'payment_status' => $b->payment?->status->value,
        ];
    }
}
