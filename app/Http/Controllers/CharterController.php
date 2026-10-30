<?php

namespace App\Http\Controllers;

use App\Actions\Charters\AdvanceCharter;
use App\Actions\Charters\RequestCharter;
use App\Enums\ApprovalStatus;
use App\Enums\CharterStatus;
use App\Http\Requests\StoreCharterRequest;
use App\Models\CharterMessage;
use App\Models\CharterRequest;
use App\Models\DriverProfile;
use App\Models\User;
use App\Support\RentalPanels;
use App\Notifications\AppNotice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Group charter ("hire the whole vehicle").
 *  - Passengers browse available drivers (a banner), send their terms, then accept or refuse the driver's price.
 *  - Drivers see incoming requests, accept the terms and name the price, or decline.
 *  - Both can chat about one request. Only those two people can ever open it.
 */
class CharterController extends Controller
{
    /** Legal actions from the URL, each mapped to the policy ability of the same name. */
    private const ACTIONS = ['accept', 'decline', 'cancel', 'complete'];

    /** GET /charters : available drivers banner + my requests (+ requests sent to me if I drive). */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $ratings = DB::table('reviews')
            ->join('bookings', 'bookings.id', '=', 'reviews.booking_id')
            ->join('rides', 'rides.id', '=', 'bookings.ride_id')
            ->join('vehicles', 'vehicles.id', '=', 'rides.vehicle_id')
            ->where('reviews.reviewer_role', 'passenger')
            ->groupBy('vehicles.driver_id')
            ->selectRaw('vehicles.driver_id as driver_id, AVG(reviews.rating) as average, COUNT(*) as total')
            ->get()->keyBy('driver_id');

        // Only approved drivers who switched "available for hire" on and own at least one vehicle.
        // Listed when the driver is open to being hired OR has a vehicle for rent (self-drive).
        $drivers = DriverProfile::with(['user:id,name,phone_number', 'vehicles.model.make'])
            ->where('status', ApprovalStatus::Approved->value)
            ->where('user_id', '!=', $user->id)
            ->where(fn ($q) => $q->where('available_for_hire', true)
                ->orWhereHas('vehicles', fn ($v) => $v->where('available_for_rent', true)->whereNotNull('daily_rate')))
            ->whereHas('vehicles')
            ->limit(20)->get()
            ->map(function (DriverProfile $p) use ($ratings) {
                $r = $ratings->get($p->user_id);

                return [
                    'id' => $p->user_id,
                    'name' => $p->user->name,
                    'phone' => $p->user->phone_number,
                    'bio' => $p->bio,
                    'rating' => $r ? round((float) $r->average, 1) : null,
                    'reviews' => $r ? (int) $r->total : 0,
                    'can_hire' => (bool) $p->available_for_hire,
                    'vehicles' => $p->vehicles->map(fn ($v) => [
                        'name' => $v->model->make->name.' '.$v->model->name,
                        'color' => $v->color,
                        'seats' => $v->seat_capacity,
                    ])->values(),
                    // Vehicles this driver lets people rent WITHOUT the driver (renter drives), at the owner's daily rate.
                    'rentals' => $p->vehicles->filter(fn ($v) => $v->available_for_rent && $v->daily_rate)->map(fn ($v) => [
                        'id' => $v->id,
                        'name' => $v->model->make->name.' '.$v->model->name,
                        'daily_rate' => $v->daily_rate,
                    ])->values(),
                ];
            })->values();

        $row = fn (CharterRequest $c, string $other) => [
            'id' => $c->id,
            'reference_no' => $c->reference_no,
            'status' => $c->status->value,
            'other' => $other,
            'group_size' => $c->group_size,
            'pickup_location' => $c->pickup_location,
            'pickup_at' => $c->pickup_at->toIso8601String(),
            'quoted_price' => $c->quoted_price,
        ];

        return Inertia::render('charters/index', [
            'drivers' => $drivers,
            'mine' => CharterRequest::with('driver:id,name')->where('passenger_id', $user->id)
                ->latest()->limit(30)->get()->map(fn ($c) => $row($c, $c->driver->name)),
            'is_driver' => $user->isApprovedDriver(),
            'incoming' => $user->isApprovedDriver()
                ? CharterRequest::with('passenger:id,name')->where('driver_id', $user->id)
                    ->latest()->limit(30)->get()->map(fn ($c) => $row($c, $c->passenger->name))
                : [],
            'available_for_hire' => (bool) $user->driverProfile?->available_for_hire,
        ] + RentalPanels::for($user));
    }

    /** GET /charters/new?driver=ID : the passenger's fill-out form. */
    public function create(Request $request): Response|RedirectResponse
    {
        $driverId = (int) $request->validate(['driver' => ['required', 'integer']])['driver'];
        $profile = DriverProfile::with(['user:id,name,phone_number', 'vehicles.model.make'])
            ->where('status', ApprovalStatus::Approved->value)
            ->where('available_for_hire', true)
            ->where('user_id', $driverId)->where('user_id', '!=', $request->user()->id)
            ->first();

        if (! $profile || $profile->vehicles->isEmpty()) {
            $this->toast('That driver is not available for hire right now.', 'warning');

            return to_route('charters.index');
        }

        return Inertia::render('charters/create', [
            'driver' => [
                'id' => $profile->user_id, 'name' => $profile->user->name,
                'phone' => $profile->user->phone_number, 'bio' => $profile->bio,
            ],
            'vehicles' => $profile->vehicles->map(fn ($v) => [
                'id' => $v->id,
                'label' => $v->model->make->name.' '.$v->model->name.' · '.$v->color,
                'seats' => $v->seat_capacity,
            ])->values(),
            // The "rent the vehicle only" alternative (first rentable vehicle), if this driver offers one.
            'rent_vehicle' => ($rv = $profile->vehicles->first(fn ($v) => $v->available_for_rent && $v->daily_rate))
                ? ['id' => $rv->id, 'daily_rate' => $rv->daily_rate]
                : null,
        ]);
    }

    /** POST /charters */
    public function store(StoreCharterRequest $request, RequestCharter $requestCharter): RedirectResponse
    {
        $charter = $requestCharter->handle($request->user(), $request->validated());
        $this->toast('Request sent. The driver will review your terms and send a price.');

        return to_route('charters.show', $charter);
    }

    /** GET /charters/{charter} : terms, price, actions and the chat. */
    public function show(Request $request, CharterRequest $charter): Response
    {
        $this->authorize('view', $charter);
        $user = $request->user();
        $role = $charter->roleOf($user);
        $charter->load(['passenger', 'driver', 'vehicle.model.make']);
        $other = $role === 'driver' ? $charter->passenger : $charter->driver;
        $status = $charter->status;

        return Inertia::render('charters/show', [
            'charter' => [
                'id' => $charter->id,
                'reference_no' => $charter->reference_no,
                'status' => $status->value,
                'group_size' => $charter->group_size,
                'pickup_location' => $charter->pickup_location,
                'dropoff_location' => $charter->dropoff_location,
                'pickup_at' => $charter->pickup_at->toIso8601String(),
                'return_location' => $charter->return_location,
                'return_at' => $charter->return_at?->toIso8601String(),
                'description' => $charter->description,
                'vehicle' => $charter->vehicle->model->make->name.' '.$charter->vehicle->model->name.' · '.$charter->vehicle->color.' · '.$charter->vehicle->plate_number,
                'quoted_price' => $charter->quoted_price,
                'driver_note' => $charter->driver_note,
                'reason' => $charter->reason,
                'accepted_at' => $charter->accepted_at?->toIso8601String(),
                'completed_at' => $charter->completed_at?->toIso8601String(),
            ],
            'role' => $role,
            // The other person: name + phone (both parties may call each other once a request exists).
            'partner' => ['name' => $other->name, 'phone' => $other->phone_number, 'label' => $role === 'driver' ? 'Passenger' : 'Driver'],
            'abilities' => [
                'quote' => $role === 'driver' && in_array($status, [CharterStatus::Pending, CharterStatus::Quoted], true),
                'decline' => $role === 'driver' && in_array($status, [CharterStatus::Pending, CharterStatus::Quoted], true),
                'accept' => $role === 'passenger' && $status === CharterStatus::Quoted,
                'cancel' => $status->isOpen(),
                'complete' => $role === 'driver' && $status === CharterStatus::Accepted && $charter->pickup_at->isPast(),
            ],
            'chat_open' => $status->isOpen(),
            'messages' => $this->messagesFor($charter, $user, 0),
        ]);
    }

    /** PATCH /charters/{charter}/quote : the driver names the price (the passenger never sets one). */
    public function quote(Request $request, CharterRequest $charter, AdvanceCharter $advance): RedirectResponse
    {
        $this->authorize('quote', $charter);
        $data = $request->validate([
            'price' => ['required', 'numeric', 'min:1', 'max:500000'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $advance->quote($charter, $request->user(), (float) $data['price'], isset($data['note']) ? trim(strip_tags($data['note'])) : null);
        $this->toast('Price sent to the passenger.');

        return back();
    }

    /** PATCH /charters/{charter}/{action} : accept | decline | cancel | complete. */
    public function transition(Request $request, CharterRequest $charter, string $action, AdvanceCharter $advance): RedirectResponse
    {
        abort_unless(in_array($action, self::ACTIONS, true), 404);
        $this->authorize($action, $charter);
        $user = $request->user();

        $reason = in_array($action, ['decline', 'cancel'], true)
            ? trim(strip_tags($request->validate(['reason' => ['required', 'string', 'min:5', 'max:255']])['reason']))
            : null;

        match ($action) {
            'accept' => $advance->accept($charter, $user),
            'decline' => $advance->decline($charter, $user, $reason),
            'cancel' => $advance->cancel($charter, $user, $reason),
            'complete' => $advance->complete($charter, $user),
        };

        $this->toast('Updated.');

        return back();
    }

    /** GET /charters/{charter}/messages?after=ID : the chat poll (JSON). */
    public function messages(Request $request, CharterRequest $charter): JsonResponse
    {
        $this->authorize('message', $charter);
        $after = (int) $request->query('after', 0);

        return response()->json(['messages' => $this->messagesFor($charter, $request->user(), $after)])
            ->header('Cache-Control', 'no-store, private');
    }

    /** POST /charters/{charter}/messages : send one chat message (JSON). */
    public function send(Request $request, CharterRequest $charter): JsonResponse
    {
        $this->authorize('message', $charter);
        abort_unless($charter->status->isOpen(), 422, 'This conversation is closed.');

        $body = trim(strip_tags((string) $request->input('body')));
        abort_if($body === '' || mb_strlen($body) > 500, 422, 'Write a message of 1 to 500 characters.');

        // Notify the other person only when the conversation changes hands (no notification per message).
        $previous = $charter->messages()->latest('id')->first();
        $message = $charter->messages()->create(['user_id' => $request->user()->id, 'body' => $body]);

        if (! $previous || $previous->user_id !== $request->user()->id) {
            $to = $charter->passenger_id === $request->user()->id ? $charter->driver : $charter->passenger;
            $to->notify(new AppNotice('New message', "{$request->user()->name} sent a message about {$charter->reference_no}.", "/charters/{$charter->id}"));
        }

        return response()->json(['message' => $this->present($message, $request->user())], 201);
    }

    /** PATCH /driver/availability : the driver's "available for hire" switch. */
    public function availability(Request $request): RedirectResponse
    {
        $profile = $request->user()->driverProfile;
        abort_unless($profile, 403);

        $profile->forceFill(['available_for_hire' => ! $profile->available_for_hire])->save();
        $this->toast($profile->available_for_hire ? 'You are now listed for group hire.' : 'You are hidden from group hire.');

        return back();
    }

    /** @return list<array<string, mixed>> */
    private function messagesFor(CharterRequest $charter, User $viewer, int $after): array
    {
        return $charter->messages()->with('sender:id,name')->where('id', '>', $after)
            ->orderBy('id')->limit(200)->get()
            ->map(fn (CharterMessage $m) => $this->present($m, $viewer))->all();
    }

    private function present(CharterMessage $m, User $viewer): array
    {
        return [
            'id' => $m->id,
            'mine' => $m->user_id === $viewer->id,
            'name' => $m->sender?->name ?? $viewer->name,
            'body' => $m->body,
            'at' => $m->created_at->toIso8601String(),
        ];
    }
}
