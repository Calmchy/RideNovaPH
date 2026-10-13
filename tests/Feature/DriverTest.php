<?php

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\City;
use App\Models\Ride;
use App\Models\Vehicle;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Scenario;

beforeEach(fn () => Scenario::lookups());

function rideForm($vehicle, array $o = []): array
{
    return $o + [
        'vehicle_id' => $vehicle->id,
        'origin_city_id' => City::where('name', 'Abuyog')->first()->id,
        'destination_city_id' => City::where('name', 'Ormoc City')->first()->id,
        'pickup_point' => 'Abuyog market', 'departure_at' => now()->addDays(2)->format('Y-m-d\TH:i'),
        'seats_offered' => 3, 'price_per_seat' => 300,
    ];
}

test('an approved driver can publish a ride on their own vehicle', function () {
    $driver = Scenario::driver();
    $vehicle = Scenario::vehicle($driver);

    $this->actingAs($driver)->post('/driver/rides', rideForm($vehicle))->assertSessionHasNoErrors();

    expect(Ride::count())->toBe(1);
});

test('a driver cannot publish with someone else\'s vehicle, too many seats, or before approval', function () {
    $driver = Scenario::driver();
    $other = Scenario::vehicle(Scenario::driver());
    $mine = Scenario::vehicle($driver, seats: 3);

    $this->actingAs($driver)->post('/driver/rides', rideForm($other))->assertSessionHasErrors('vehicle_id');
    $this->actingAs($driver)->post('/driver/rides', rideForm($mine, ['seats_offered' => 4]))->assertSessionHasErrors('seats_offered');

    $pending = Scenario::driver(approved: false);
    $this->actingAs($pending)->post('/driver/rides', rideForm(Scenario::vehicle($pending)))->assertForbidden();
});

test('passengers cannot open driver pages', function () {
    $this->actingAs(Scenario::passenger())->get('/driver')->assertForbidden();
    $this->actingAs(Scenario::passenger())->post('/driver/rides', [])->assertForbidden();
});

test('a driver only edits their own vehicles', function () {
    $mine = Scenario::driver();
    $theirs = Scenario::vehicle(Scenario::driver());

    $this->actingAs($mine)->delete("/driver/vehicles/{$theirs->id}")->assertForbidden();
    expect(Vehicle::find($theirs->id))->not->toBeNull();
});

test('vehicle registration validates the plate and is unique', function () {
    $driver = Scenario::driver();
    $first = Scenario::vehicle($driver);
    $body = ['model_id' => $first->model_id, 'color' => 'Blue', 'plate_number' => 'XYZ 9999', 'seat_capacity' => 4];

    $this->actingAs($driver)->post('/driver/vehicles', $body)->assertSessionHasNoErrors();
    $this->actingAs($driver)->post('/driver/vehicles', $body)->assertSessionHasErrors('plate_number');
    $this->actingAs($driver)->post('/driver/vehicles', ['plate_number' => '<script>'] + $body)->assertSessionHasErrors('plate_number');
});

test('trip status: start, complete issues receipts, unconfirmed bookings are closed', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $confirmed = Scenario::passenger();
    $waiting = Scenario::passenger();

    foreach ([$confirmed, $waiting] as $p) {
        $this->actingAs($p)->post("/rides/{$ride->id}/book", Scenario::bookingForm())->assertSessionHasNoErrors();
    }
    $b1 = $confirmed->bookings()->first();
    $this->actingAs($driver)->patch("/bookings/{$b1->id}/approve");
    $this->actingAs($confirmed)->patch("/bookings/{$b1->id}/confirm");

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}/complete")->assertSessionHasErrors('trip'); // not started yet
    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}/start")->assertSessionHasNoErrors();
    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}/complete")->assertSessionHasNoErrors();

    expect($b1->fresh()->status)->toBe(BookingStatus::Completed)
        ->and($b1->payment->fresh()->status)->toBe(PaymentStatus::Paid)
        ->and($waiting->bookings()->first()->status)->toBe(BookingStatus::Cancelled)
        ->and($ride->fresh()->tripStatus())->toBe('completed');
});

test('cancelling a ride cancels every open booking and notifies passengers', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $passenger = Scenario::passenger();
    $this->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm());

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}/cancel", ['reason' => 'Car trouble'])->assertSessionHasNoErrors();

    expect($ride->fresh()->tripStatus())->toBe('cancelled')
        ->and($passenger->bookings()->first()->status)->toBe(BookingStatus::Cancelled)
        ->and($passenger->notifications()->count())->toBe(1);
});

test('another driver cannot control my ride', function () {
    $ride = Scenario::ride(Scenario::driver());

    $this->actingAs(Scenario::driver())->patch("/driver/rides/{$ride->id}/start")->assertForbidden();
});

test('a rejected driver can resubmit a licence; an approved one cannot', function () {
    Storage::fake('local');
    $driver = Scenario::driver(approved: false);
    $profile = $driver->driverProfile;
    $form = fn () => [
        'license_number' => 'N01-99-000001', 'license_expiry' => now()->addYears(2)->toDateString(),
        'license_image' => UploadedFile::fake()->image('licence.jpg'), 'consent' => true,
    ];

    // Pending: blocked.
    $this->actingAs($driver)->post('/driver/apply', $form());
    expect($profile->fresh()->license_number)->not->toBe('N01-99-000001');

    // Rejected: allowed, goes back to pending, reason cleared.
    $profile->forceFill(['status' => 'rejected', 'remarks' => 'Blurry photo'])->save();
    $this->actingAs($driver)->post('/driver/apply', $form())->assertSessionHasNoErrors();

    $profile->refresh();
    expect($profile->status->value)->toBe('pending')->and($profile->remarks)->toBeNull()->and($profile->license_number)->toBe('N01-99-000001');
    Storage::disk('local')->assertExists($profile->license_image_path);
});
