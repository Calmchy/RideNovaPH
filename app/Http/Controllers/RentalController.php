<?php

namespace App\Http\Controllers;

use App\Actions\Rentals\AdvanceRental;
use App\Actions\Rentals\ExtendRental;
use App\Actions\Rentals\RequestRental;
use App\Enums\ApprovalStatus;
use App\Enums\RentalStatus;
use App\Http\Requests\StoreRentalRequest;
use App\Models\RentalExtension;
use App\Models\RentalRequest;
use App\Models\Vehicle;
use App\Support\Like;
use App\Support\PlaceResolver;
use App\Support\RentalPanels;
use App\Support\RentalTerms;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Self-drive vehicle rental ("just rent the vehicle").
 *  - Owners (approved drivers) switch a vehicle on and set THEIR OWN price per day.
 *  - Renters fill in their details, when and where; the owner approves or declines.
 *  - Money is cash between the two people; the site only records the agreement.
 */
class RentalController extends Controller
{
    private const ACTIONS = ['approve', 'decline', 'cancel', 'complete'];

    private function label(Vehicle $v): string
    {
        return RentalPanels::label($v);
    }

    /** GET /rent : everyone signed in can browse the vehicles owners listed for rent. */
    public function browse(Request $request): Response
    {
        $f = $request->validate([
            'q' => ['nullable', 'string', 'max:40'],
            'sort' => ['nullable', 'in:price_asc,price_desc,newest'],
        ]);

        $vehicles = Vehicle::with(['model.make', 'driver.user:id,name'])
            ->where('available_for_rent', true)->whereNotNull('daily_rate')
            ->whereHas('driver', fn ($d) => $d->where('status', ApprovalStatus::Approved->value))
            // Never offer someone their own vehicle.
            ->where('driver_id', '!=', $request->user()->id)
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->whereHas('model', fn ($m) => $m->where('name', 'like', Like::contains($v))
                    ->orWhereHas('make', fn ($k) => $k->where('name', 'like', Like::contains($v))))
                ->orWhere('color', 'like', Like::contains($v))))
            ->when(($f['sort'] ?? null) === 'price_asc', fn ($q) => $q->orderBy('daily_rate'))
            ->when(($f['sort'] ?? null) === 'price_desc', fn ($q) => $q->orderByDesc('daily_rate'))
            ->when(! ($f['sort'] ?? null) || $f['sort'] === 'newest', fn ($q) => $q->latest('updated_at'))
            ->paginate(12)->withQueryString();

        return Inertia::render('rentals/browse', [
            'filters' => $f,
            'vehicles' => $vehicles->through(fn (Vehicle $v) => [
                'id' => $v->id,
                'name' => $this->label($v),
                'plate_number' => $v->plate_number,
                'seats' => $v->seat_capacity,
                'year' => $v->manufacture_year,
                'daily_rate' => $v->daily_rate,
                'owner' => $v->driver->user->name,
                'photo_front' => $v->photo_front_path ? '/storage/'.$v->photo_front_path : null,
                'photo_back' => $v->photo_back_path ? '/storage/'.$v->photo_back_path : null,
                'description' => $v->description,
                'rented_out' => $v->isRentedOut(),
            ]),
        ]);
    }

    /** GET /rentals : rentals live inside the "Hire a driver" page, so send people there. */
    public function index(): RedirectResponse
    {
        return to_route('charters.index');
    }

    /** GET /driver/rentals : the owner's own page: switch vehicles on for rent, set terms, see incoming requests. */
    public function manage(Request $request): Response
    {
        return Inertia::render('driver/rentals', RentalPanels::for($request->user()));
    }

    /** GET /rentals/new?vehicle=ID : the renter's fill-out form. */
    public function create(Request $request): Response|RedirectResponse
    {
        $id = (int) $request->validate(['vehicle' => ['required', 'integer']])['vehicle'];
        $vehicle = Vehicle::with(['driver.user:id,name', 'model.make'])->find($id);

        if (! $vehicle || ! $vehicle->available_for_rent || ! $vehicle->daily_rate
            || $vehicle->driver_id === $request->user()->id
            || $vehicle->driver?->status !== ApprovalStatus::Approved) {
            $this->toast('That vehicle is not available for rent right now.', 'warning');

            return to_route('charters.index');
        }

        $user = $request->user();

        return Inertia::render('rentals/create', [
            'vehicle' => [
                'id' => $vehicle->id,
                'name' => $this->label($vehicle),
                'seats' => $vehicle->seat_capacity,
                'daily_rate' => $vehicle->daily_rate,
                'owner' => $vehicle->driver->user->name,
                'terms' => RentalTerms::present($vehicle->rental_terms),
                'min_age' => $vehicle->rental_terms['min_age'] ?? null,
                'min_experience_years' => $vehicle->rental_terms['min_experience_years'] ?? null,
            ],
            // Pre-fill what we already know about the renter (they can change it).
            'defaults' => ['name' => $user->name, 'phone' => $user->phone_number, 'address' => $user->address],
            'max_days' => RequestRental::MAX_DAYS,
            'places' => PlaceResolver::all(),
        ]);
    }

    /** POST /rentals */
    public function store(StoreRentalRequest $request, RequestRental $requestRental): RedirectResponse
    {
        $rental = $requestRental->handle($request->user(), $request->validated());
        $this->toast('Request sent. The owner will review your details.');

        return to_route('rentals.show', $rental);
    }

    /** GET /rentals/{rental} */
    public function show(Request $request, RentalRequest $rental): Response
    {
        $this->authorize('view', $rental);
        $role = $rental->roleOf($request->user());
        $rental->load(['renter', 'owner', 'vehicle.model.make', 'extensions']);
        $status = $rental->status;
        $other = $role === 'owner' ? $rental->renter : $rental->owner;

        return Inertia::render('rentals/show', [
            'rental' => [
                'id' => $rental->id,
                'reference_no' => $rental->reference_no,
                'status' => $status->value,
                'vehicle' => $this->label($rental->vehicle).' · '.$rental->vehicle->plate_number,
                'start_at' => $rental->start_at->toIso8601String(),
                'end_at' => $rental->end_at->toIso8601String(),
                'pickup_location' => $rental->pickup_location,
                'return_location' => $rental->return_location,
                'purpose' => $rental->purpose,
                'days' => $rental->days,
                'daily_rate' => $rental->daily_rate,
                'total_price' => $rental->total_price,
                'owner_note' => $rental->owner_note,
                'reason' => $rental->reason,
                // Renter details: only the two people on this request ever get this page.
                'renter' => [
                    'name' => $rental->renter_name,
                    'phone' => $rental->renter_phone,
                    'address' => $rental->renter_address,
                    // Private photo, streamed only to the renter and the owner. ?v busts the cache.
                    'license_id_url' => $rental->license_id_path ? "/rentals/{$rental->id}/license-id?v={$rental->updated_at->timestamp}" : null,
                    // Safety details (only the two people on this request ever get this page).
                    'birth_date' => $rental->birth_date,
                    'age' => $rental->birth_date ? Carbon::parse($rental->birth_date)->age : null,
                    'license_type' => RentalRequest::LICENSE_TYPES[$rental->license_type] ?? null,
                    'driving_years' => $rental->driving_years,
                    'passenger_count' => $rental->passenger_count,
                    'emergency_name' => $rental->emergency_name,
                    'emergency_phone' => $rental->emergency_phone,
                    'emergency_relationship' => $rental->emergency_relationship,
                    'emergency_address' => $rental->emergency_address,
                    'destination' => $rental->destination,
                    'additional_drivers' => $rental->additional_drivers,
                    'signature_name' => $rental->signature_name,
                ],
            ],
            'extension' => [
                'notice_hours' => ExtendRental::NOTICE_HOURS,
                'deadline' => ExtendRental::deadline($rental)->toIso8601String(),
                'max_days' => max(0, RequestRental::MAX_DAYS - $rental->days),
                'daily_rate' => $rental->daily_rate,
                'can_request' => $role === 'renter' && $status === RentalStatus::Approved
                    && now()->lte(ExtendRental::deadline($rental))
                    && ! $rental->extensions->contains('status', 'pending')
                    && $rental->days < RequestRental::MAX_DAYS,
                'can_decide' => $role === 'owner' && $status === RentalStatus::Approved,
                'list' => $rental->extensions->map(fn (RentalExtension $e) => [
                    'id' => $e->id,
                    'days' => $e->days,
                    'extra_price' => $e->extra_price,
                    'new_end_at' => $e->new_end_at->toIso8601String(),
                    'status' => $e->status,
                    'reason' => $e->reason,
                    'created_at' => $e->created_at->toIso8601String(),
                ])->values(),
            ],
            'terms' => RentalTerms::present($rental->terms_snapshot),
            'terms_accepted_at' => $rental->terms_accepted_at?->toIso8601String(),
            'role' => $role,
            // The owner's phone is revealed to the renter only once the rental is approved.
            'partner' => [
                'label' => $role === 'owner' ? 'Renter' : 'Owner',
                'name' => $other->name,
                'phone' => $role === 'owner' || in_array($status, [RentalStatus::Approved, RentalStatus::Completed], true)
                    ? ($role === 'owner' ? $rental->renter_phone : $other->phone_number)
                    : null,
            ],
            'abilities' => [
                'approve' => $role === 'owner' && $status === RentalStatus::Pending,
                'decline' => $role === 'owner' && $status === RentalStatus::Pending,
                'cancel' => $status->isOpen(),
                'complete' => $role === 'owner' && $status === RentalStatus::Approved && $rental->start_at->isPast(),
            ],
        ]);
    }

    /** PATCH /rentals/{rental}/{action} : approve | decline | cancel | complete. */
    public function transition(Request $request, RentalRequest $rental, string $action, AdvanceRental $advance): RedirectResponse
    {
        abort_unless(in_array($action, self::ACTIONS, true), 404);
        $this->authorize($action, $rental);
        $user = $request->user();

        $reason = in_array($action, ['decline', 'cancel'], true)
            ? trim(strip_tags($request->validate(['reason' => ['required', 'string', 'min:5', 'max:255']])['reason']))
            : null;
        // The optional note is absent from the validated data when empty, so read it with a default.
        $note = $action === 'approve'
            ? trim(strip_tags((string) ($request->validate(['note' => ['nullable', 'string', 'max:500']])['note'] ?? '')))
            : null;

        match ($action) {
            'approve' => $advance->approve($rental, $user, $note ?: null),
            'decline' => $advance->decline($rental, $user, $reason),
            'cancel' => $advance->cancel($rental, $user, $reason),
            'complete' => $advance->complete($rental, $user),
        };

        $this->toast('Updated.');

        return back();
    }

    /** GET /rentals/{rental}/license-id : the renter's licence ID photo. Only the two people on this rental can open it. */
    public function licenseId(Request $request, RentalRequest $rental): StreamedResponse
    {
        $this->authorize('view', $rental);
        abort_unless($rental->license_id_path && Storage::disk('local')->exists($rental->license_id_path), 404);

        return Storage::disk('local')->response($rental->license_id_path, null, [
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** POST /rentals/{rental}/extensions : the RENTER asks for more days (at least 72 hours before the return time). */
    public function extend(Request $request, RentalRequest $rental, ExtendRental $extend): RedirectResponse
    {
        abort_unless($rental->renter_id === $request->user()->id, 403);
        $days = (int) $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:'.RequestRental::MAX_DAYS],
        ], ['days.required' => 'Enter how many days you want to add.'])['days'];

        $extend->request($rental, $request->user(), $days);
        $this->toast('Extension request sent. The owner will accept or decline it.');

        return back();
    }

    /** PATCH /rentals/{rental}/extensions/{extension}/{action} : the OWNER accepts or declines. */
    public function extension(Request $request, RentalRequest $rental, RentalExtension $extension, string $action, ExtendRental $extend): RedirectResponse
    {
        abort_unless(in_array($action, ['approve', 'decline'], true), 404);
        abort_unless($extension->rental_request_id === $rental->id && $rental->owner_id === $request->user()->id, 403);

        if ($action === 'approve') {
            $extend->approve($extension, $request->user());
        } else {
            $reason = trim(strip_tags($request->validate(['reason' => ['required', 'string', 'min:5', 'max:255']])['reason']));
            $extend->decline($extension, $request->user(), $reason);
        }

        $this->toast('Updated.');

        return back();
    }

    /**
     * PATCH /rentals/vehicles/{vehicle} : the OWNER switches a vehicle on/off for rent and sets the price per day.
     * Only the vehicle's own driver can do this; the rate is validated here, never trusted from a renter.
     */
    public function vehicle(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isApprovedDriver() && $vehicle->driver_id === $user->id, 403);

        $data = $request->validate([
            'available_for_rent' => ['required', 'boolean'],
            'daily_rate' => ['nullable', 'numeric', 'min:1', 'max:100000', 'required_if:available_for_rent,true'],
        ] + RentalTerms::rules());

        $vehicle->forceFill([
            'available_for_rent' => (bool) $data['available_for_rent'],
            'daily_rate' => isset($data['daily_rate']) ? round((float) $data['daily_rate'], 2) : $vehicle->daily_rate,
            // Only touched when the owner sent the terms form; an empty form clears them.
            'rental_terms' => $request->has('terms') ? RentalTerms::clean($data['terms'] ?? null) : $vehicle->rental_terms,
        ])->save();

        $this->toast($vehicle->available_for_rent ? 'Saved. Your vehicle is listed for rent.' : 'Saved. Your vehicle is hidden from rentals.');

        return back();
    }

    /** POST /rentals/vehicles/{vehicle}/publish : the owner's "Publish my unit for rent" form. */
    public function publish(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isApprovedDriver() && $vehicle->driver_id === $user->id, 403);

        $request->merge([
            'plate_number' => strtoupper(trim((string) $request->input('plate_number'))),
            'vin' => strtoupper(trim((string) $request->input('vin'))),
        ]);

        $photo = fn (string $existing) => [
            $existing ? 'nullable' : 'required',
            File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024),
        ];

        $data = $request->validate([
            'plate_number' => ['required', 'string', 'min:5', 'max:15', 'regex:/^[A-Z0-9 -]+$/', 'unique:vehicles,plate_number,'.$vehicle->id],
            // A real VIN is 17 characters and never contains I, O or Q.
            'vin' => ['required', 'regex:/^[A-HJ-NPR-Z0-9]{17}$/', 'unique:vehicles,vin,'.$vehicle->id],
            'photo_front' => $photo((string) $vehicle->photo_front_path),
            'photo_back' => $photo((string) $vehicle->photo_back_path),
            'daily_rate' => ['required', 'numeric', 'min:1', 'max:100000'],
        ], [
            'vin.regex' => 'A VIN is 17 letters and numbers (no I, O or Q).',
            'plate_number.regex' => 'Use letters, numbers, spaces or dashes only.',
            'photo_front.required' => 'Upload a photo of the front of the unit.',
            'photo_back.required' => 'Upload a photo of the back of the unit.',
        ]);

        $changes = [
            'plate_number' => $data['plate_number'],
            'vin' => $data['vin'],
            'daily_rate' => round((float) $data['daily_rate'], 2),
            'available_for_rent' => true,
        ];

        foreach (['photo_front' => 'photo_front_path', 'photo_back' => 'photo_back_path'] as $field => $column) {
            if ($request->hasFile($field)) {
                /** @var UploadedFile $file */
                $file = $request->file($field);
                $old = $vehicle->{$column};
                $changes[$column] = $file->storeAs('vehicles', Str::uuid().'.'.$file->guessExtension(), 'public');

                if ($old) {
                    Storage::disk('public')->delete($old);
                }
            }
        }

        $vehicle->forceFill($changes)->save();
        $this->toast('Published. Your unit is now listed for rent.');

        return back();
    }
}
