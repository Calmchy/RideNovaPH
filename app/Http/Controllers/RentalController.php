<?php

namespace App\Http\Controllers;

use App\Actions\Rentals\AdvanceRental;
use App\Actions\Rentals\RequestRental;
use App\Enums\ApprovalStatus;
use App\Enums\RentalStatus;
use App\Http\Requests\StoreRentalRequest;
use App\Models\RentalRequest;
use App\Models\Vehicle;
use App\Support\RentalPanels;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    /** GET /rentals : rentals live inside the "Hire a driver" page, so send people there. */
    public function index(): RedirectResponse
    {
        return to_route('charters.index');
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
            ],
            // Pre-fill what we already know about the renter (they can change it).
            'defaults' => ['name' => $user->name, 'phone' => $user->phone_number, 'address' => $user->address],
            'max_days' => RequestRental::MAX_DAYS,
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
        $rental->load(['renter', 'owner', 'vehicle.model.make']);
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
                    'license_number' => $rental->license_number,
                    'license_expiry' => $rental->license_expiry->toDateString(),
                ],
            ],
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
        ]);

        $vehicle->forceFill([
            'available_for_rent' => (bool) $data['available_for_rent'],
            'daily_rate' => isset($data['daily_rate']) ? round((float) $data['daily_rate'], 2) : $vehicle->daily_rate,
        ])->save();

        $this->toast($vehicle->available_for_rent ? 'Saved. Your vehicle is listed for rent.' : 'Saved. Your vehicle is hidden from rentals.');

        return back();
    }
}
