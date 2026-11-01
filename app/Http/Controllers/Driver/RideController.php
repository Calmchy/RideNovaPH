<?php

namespace App\Http\Controllers\Driver;

use App\Actions\Rides\PublishRide;
use App\Actions\Rides\UpdateRide;
use App\Actions\Rides\UpdateTripStatus;
use App\Enums\BookingStatus;
use App\Enums\RideStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRideRequest;
use App\Http\Requests\UpdateRideRequest;
use App\Models\Announcement;
use App\Models\Banner;
use App\Models\City;
use App\Models\Ride;
use App\Models\Vehicle;
use App\Support\Like;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/** Ride publishing, passenger list and trip status for the signed-in driver. */
class RideController extends Controller
{
    /** GET /driver/rides?status= */
    public function index(Request $request): Response
    {
        $f = $request->validate([
            'status' => ['nullable', 'in:open,completed,cancelled'],
            'q' => ['nullable', 'string', 'max:40'],
        ]);

        $rides = Ride::with(['origin', 'destination', 'vehicle.model.make'])->withSeatsTaken()
            ->whereHas('vehicle', fn ($q) => $q->where('driver_id', $request->user()->id))
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->whereHas('origin', fn ($c) => $c->where('name', 'like', Like::contains($v)))
                ->orWhereHas('destination', fn ($c) => $c->where('name', 'like', Like::contains($v)))))
            ->orderByDesc('departure_at')->paginate(10)->withQueryString();

        return Inertia::render('driver/rides/index', [
            'filters' => $f,
            'rides' => $rides->through(fn (Ride $r) => [
                'id' => $r->id,
                'route' => $r->origin->name.' → '.$r->destination->name,
                'departure_at' => $r->departure_at->toIso8601String(),
                'price_per_seat' => $r->price_per_seat,
                'seats_offered' => $r->seats_offered,
                'seats_taken' => (int) $r->seats_taken,
                'vehicle' => $r->vehicle->model->make->name.' '.$r->vehicle->model->name,
                'trip_status' => $r->tripStatus(),
            ]),
        ]);
    }

    /** GET /driver/rides/create */
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->isApprovedDriver()) {
            $this->toast('Your driver licence must be approved before you can publish rides.', 'warning');

            return to_route('driver.apply');
        }

        return Inertia::render('driver/rides/create', [
            'vehicles' => Vehicle::with('model.make')->where('driver_id', $request->user()->id)->get()
                ->map(fn ($v) => ['id' => $v->id, 'label' => $v->model->make->name.' '.$v->model->name.' · '.$v->plate_number, 'seat_capacity' => $v->seat_capacity]),
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'announcements' => $this->eventOptions(),
            'ride' => null,
            'prefill' => $this->prefillFromSlide($request),
            'locked' => false,
        ]);
    }

    /**
     * Dashboard banner / announcement -> a publish form that is already filled in as far as the
     * announcement says. Read on the server from the id (never from typed-in text), and only a
     * suggestion: the driver still picks the vehicle, origin, time, seats and price.
     *
     * @return array<string, string>|null
     */
    private function prefillFromSlide(Request $request): ?array
    {
        if ($id = $request->integer('announcement')) {
            $a = Announcement::forRides()->find($id);

            return $a ? [
                'source' => $a->title,
                'announcement_id' => (string) $a->id,
                'event_name' => '',
                'destination_city_id' => $a->city_id ? (string) $a->city_id : '',
                // Exam day at 5 AM as a starting point (the driver adjusts it); past dates are left empty.
                'departure_at' => $a->exam_date && $a->exam_date->gte(today()) ? $a->exam_date->copy()->setTime(5, 0)->format('Y-m-d\TH:i') : '',
                'notes' => '',
            ] : null;
        }

        if ($id = $request->integer('banner')) {
            $b = Banner::slideshow()->find($id);

            if (! $b) {
                return null;
            }

            // The destination the admin chose for the banner. If none, a city (or its province, e.g.
            // "Palawan") named in the title or caption is used.
            $cityId = $b->city_id;

            if (! $cityId) {
                $text = mb_strtolower($b->title.' '.$b->caption);
                $cityId = City::with('province:id,name')->orderBy('name')->get(['id', 'name', 'province_id'])->first(
                    fn (City $c) => str_contains($text, mb_strtolower(Str::of($c->name)->replaceLast(' City', '')->toString()))
                        || ($c->province && str_contains($text, mb_strtolower($c->province->name))),
                )?->id;
            }

            return [
                'source' => $b->title,
                'announcement_id' => '',
                'event_name' => mb_substr($b->title, 0, 120),
                'destination_city_id' => $cityId ? (string) $cityId : '',
                'departure_at' => '',
                'notes' => mb_substr((string) $b->caption, 0, 500),
            ];
        }

        return null;
    }

    /**
     * GET /driver/rides/{ride}/edit : the same form as publishing, pre-filled.
     * `locked` tells the form which fields are frozen because passengers already booked.
     */
    public function edit(Request $request, Ride $ride): Response|RedirectResponse
    {
        $this->owned($request, $ride);

        if ($ride->tripStatus() !== 'scheduled') {
            $this->toast('Only a ride that has not started can be edited.', 'warning');

            return to_route('driver.rides.show', $ride);
        }

        $booked = (int) $ride->bookings()->where('status', '!=', BookingStatus::Cancelled->value)->sum('seats_booked');

        return Inertia::render('driver/rides/create', [
            'vehicles' => Vehicle::with('model.make')->where('driver_id', $request->user()->id)->get()
                ->map(fn ($v) => ['id' => $v->id, 'label' => $v->model->make->name.' '.$v->model->name.' · '.$v->plate_number, 'seat_capacity' => $v->seat_capacity]),
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'announcements' => $this->eventOptions($ride->announcement_id),
            'ride' => [
                'id' => $ride->id,
                'vehicle_id' => (string) $ride->vehicle_id,
                'origin_city_id' => (string) $ride->origin_city_id,
                'destination_city_id' => (string) $ride->destination_city_id,
                'pickup_point' => $ride->pickup_point,
                'dropoff_point' => $ride->dropoff_point ?? '',
                'departure_at' => $ride->departure_at->format('Y-m-d\TH:i'),
                'seats_offered' => (string) $ride->seats_offered,
                'price_per_seat' => (string) $ride->price_per_seat,
                'notes' => $ride->notes ?? '',
                'announcement_id' => $ride->announcement_id ? (string) $ride->announcement_id : '',
                'event_name' => $ride->event_name ?? '',
                'seats_booked' => $booked,
            ],
            'locked' => $booked > 0,
        ]);
    }

    /** PATCH /driver/rides/{ride} */
    public function update(UpdateRideRequest $request, Ride $ride, UpdateRide $update): RedirectResponse
    {
        $this->owned($request, $ride);
        $update->handle($request->user(), $ride, $request->validated());
        $this->toast('Ride updated.');

        return to_route('driver.rides.show', $ride);
    }

    /**
     * Events a ride can be linked to: every published announcement that is undated or not past
     * (so whatever an admin posts shows up here), plus the ride's current one when editing.
     * Only the event NAME is sent (no city), as the form shows just the event.
     *
     * @return array<int, array{id: int, title: string}>
     */
    private function eventOptions(?int $include = null): array
    {
        return Announcement::forRides()->limit(30)->get()
            ->when($include, fn ($c) => $c->contains('id', $include) ? $c : $c->push(Announcement::find($include))->filter())
            ->map(fn (Announcement $a) => ['id' => $a->id, 'title' => $a->eventName()])
            ->values()->all();
    }

    /** POST /driver/rides */
    public function store(StoreRideRequest $request, PublishRide $publish): RedirectResponse
    {
        $ride = $publish->handle($request->user(), $request->validated());
        $this->toast('Ride published.');

        return to_route('driver.rides.show', $ride);
    }

    /** GET /driver/rides/{ride} : trip status + passenger list (contact details are only for the driver of this ride). */
    public function show(Request $request, Ride $ride): Response
    {
        $this->owned($request, $ride);
        $ride->load(['origin', 'destination', 'vehicle.model.make', 'bookings.passenger:id,name', 'bookings.payment'])->loadSum(
            ['bookings as seats_taken' => fn ($b) => $b->where('status', '!=', BookingStatus::Cancelled->value)],
            'seats_booked',
        );

        return Inertia::render('driver/rides/show', [
            'ride' => [
                'id' => $ride->id,
                'route' => $ride->origin->name.' → '.$ride->destination->name,
                'pickup_point' => $ride->pickup_point,
                'dropoff_point' => $ride->dropoff_point,
                'departure_at' => $ride->departure_at->toIso8601String(),
                'price_per_seat' => $ride->price_per_seat,
                'seats_offered' => $ride->seats_offered,
                'seats_taken' => (int) $ride->seats_taken,
                'vehicle' => $ride->vehicle->model->make->name.' '.$ride->vehicle->model->name.' · '.$ride->vehicle->plate_number,
                'notes' => $ride->notes,
                'event' => $ride->eventLabel(),
                'trip_status' => $ride->tripStatus(),
                'started_at' => $ride->started_at?->toIso8601String(),
                'completed_at' => $ride->completed_at?->toIso8601String(),
                'cancellation_reason' => $ride->cancellation_reason,
            ],
            'passengers' => $ride->bookings->sortBy('created_at')->values()->map(fn ($b) => [
                'id' => $b->id,
                'reference_no' => $b->reference_no,
                'name' => $b->passenger->name,
                'phone' => $b->contact_phone,
                'seats' => $b->seats_booked,
                'status' => $b->status->value,
                'pickup_location' => $b->pickup_location,
                'payment_status' => $b->payment?->status->value,
                'earnings' => $b->payment?->driver_earnings,
            ]),
        ]);
    }

    /** PATCH /driver/rides/{ride}/start */
    public function start(Request $request, Ride $ride, UpdateTripStatus $trip): RedirectResponse
    {
        $this->owned($request, $ride);
        $trip->start($ride);
        $this->toast('Trip started. Passengers were notified.');

        return back();
    }

    /** PATCH /driver/rides/{ride}/complete */
    public function complete(Request $request, Ride $ride, UpdateTripStatus $trip): RedirectResponse
    {
        $this->owned($request, $ride);
        $trip->complete($ride);
        $this->toast('Trip completed. Receipts were issued for confirmed passengers.');

        return back();
    }

    /** PATCH /driver/rides/{ride}/cancel */
    public function cancel(Request $request, Ride $ride, UpdateTripStatus $trip): RedirectResponse
    {
        $this->owned($request, $ride);
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? null;
        $trip->cancel($ride, $reason, $request->user());
        $this->toast('Ride cancelled. Passengers were notified.');

        return back();
    }

    private function owned(Request $request, Ride $ride): void
    {
        $ride->loadMissing('vehicle');
        abort_unless($ride->vehicle->driver_id === $request->user()->id, 403);
    }
}
