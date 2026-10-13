<?php

namespace App\Actions\Bookings;

use App\Actions\Payments\SettlePayment;
use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AppNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The booking state machine: pending -> approved -> confirmed -> completed,
 * or cancelled from any open state. Who may trigger each move is decided by
 * BookingPolicy; WHICH moves are legal is decided only here.
 *
 * Side effects that belong to a move live here too, so no controller can forget them:
 *   completed -> the cash payment is settled and a receipt number is issued
 *   cancelled -> an unpaid payment is voided
 *   every move -> the other party gets an in-app notification
 *
 * Seats are derived by query (see Ride::seatsLeft): cancelling simply stops the booking counting.
 */
class TransitionBooking
{
    /** @var array<string, list<BookingStatus>> allowed previous states for each target */
    private const ALLOWED_FROM = [
        'approved' => [BookingStatus::Pending],
        'confirmed' => [BookingStatus::Approved],
        'completed' => [BookingStatus::Confirmed],
        'cancelled' => [BookingStatus::Pending, BookingStatus::Approved, BookingStatus::Confirmed],
    ];

    public function __construct(private readonly SettlePayment $settle) {}

    /**
     * @param  User|null  $actor  who is doing it (null = system, e.g. a ride cancelled by its driver)
     * @param  bool  $force  admin/system override: skips the passenger cancellation cut-off
     */
    public function handle(Booking $booking, BookingStatus $to, ?string $reason = null, ?User $actor = null, bool $force = false): Booking
    {
        $locked = DB::transaction(function () use ($booking, $to, $reason, $actor, $force) {
            // Re-read under a row lock so two clicks (or two tabs) can't both win.
            $locked = Booking::with(['ride', 'payment'])->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if (! in_array($locked->status, self::ALLOWED_FROM[$to->value] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => "A {$locked->status->value} booking can't become {$to->value}.",
                ]);
            }

            // A trip can only be marked completed once it has departed (or the driver pressed "Start trip").
            if ($to === BookingStatus::Completed && $locked->ride->departure_at->isFuture() && ! $locked->ride->started_at) {
                throw ValidationException::withMessages(['status' => 'This trip has not departed yet.']);
            }

            // Passengers can't cancel at the last minute (the driver planned around them).
            if ($to === BookingStatus::Cancelled && ! $force && $actor && $actor->id === $locked->passenger_id) {
                $cutoff = Setting::int('cancellation_cutoff_hours');
                if ($locked->ride->departure_at->diffInHours(now(), false) > -$cutoff) {
                    throw ValidationException::withMessages([
                        'status' => "Bookings can't be cancelled within {$cutoff} hour(s) of departure. Please contact the driver.",
                    ]);
                }
            }

            $locked->forceFill(match ($to) {
                BookingStatus::Approved => ['status' => $to, 'approved_at' => now()],
                BookingStatus::Confirmed => ['status' => $to, 'confirmed_at' => now()],
                BookingStatus::Completed => ['status' => $to, 'completed_at' => now()],
                BookingStatus::Cancelled => [
                    'status' => $to,
                    'cancelled_at' => now(),
                    'cancellation_reason' => $reason ? mb_substr($reason, 0, 255) : null,
                ],
                default => throw new \LogicException('Unsupported transition.'),
            })->save();

            if ($to === BookingStatus::Completed) {
                $this->settle->handle($locked);
            }

            if ($to === BookingStatus::Cancelled && $locked->payment?->status === PaymentStatus::Pending) {
                $locked->payment->forceFill(['status' => PaymentStatus::Void])->save();
            }

            return $locked;
        });

        $this->notify($locked, $to, $actor);

        return $locked;
    }

    /** Tell the OTHER side what happened. */
    private function notify(Booking $booking, BookingStatus $to, ?User $actor): void
    {
        $booking->loadMissing('passenger', 'ride.vehicle.driver.user');
        $driver = $booking->ride->vehicle->driver->user;
        $passenger = $booking->passenger;
        $url = "/bookings/{$booking->id}";
        $ref = $booking->reference_no;

        match ($to) {
            BookingStatus::Approved => $passenger->notify(new AppNotice('Seat approved', "The driver approved {$ref}. Please confirm your booking.", $url)),
            BookingStatus::Confirmed => $driver->notify(new AppNotice('Booking confirmed', "{$passenger->name} confirmed {$ref}.", $url)),
            BookingStatus::Completed => $passenger->notify(new AppNotice('Trip completed', "Your receipt for {$ref} is ready. Leave a review for your driver.", $url)),
            BookingStatus::Cancelled => collect([$passenger, $driver])
                ->reject(fn (User $u) => $actor && $u->id === $actor->id)
                ->each(fn (User $u) => $u->notify(new AppNotice('Booking cancelled', "{$ref} was cancelled.", $url))),
            default => null,
        };
    }
}
