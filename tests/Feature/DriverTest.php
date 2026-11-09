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

test('a driver can start from a town typed or picked from the Philippine list', function () {
    $driver = Scenario::driver();
    $vehicle = Scenario::vehicle($driver);
    $cities = City::count();

    $this->actingAs($driver)->post('/driver/rides', rideForm($vehicle, [
        'origin_city_id' => null, 'origin_province' => 'Leyte', 'origin_place' => '  Barangay   San Roque, Abuyog ',
    ]))->assertSessionHasNoErrors();

    $ride = Ride::latest('id')->first();
    expect($ride->origin->name)->toBe('Barangay San Roque, Abuyog')
        ->and($ride->origin->province->name)->toBe('Leyte')
        ->and(City::count())->toBe($cities + 1);

    // The same place typed again reuses the row instead of duplicating it.
    $this->actingAs($driver)->post('/driver/rides', rideForm($vehicle, [
        'origin_city_id' => null, 'origin_province' => 'leyte', 'origin_place' => 'barangay san roque, abuyog',
    ]))->assertSessionHasNoErrors();
    expect(City::count())->toBe($cities + 1);
});

test('an own place needs a real province, no odd symbols, and cannot equal the destination', function () {
    $driver = Scenario::driver();
    $vehicle = Scenario::vehicle($driver);

    $this->actingAs($driver)->post('/driver/rides', rideForm($vehicle, [
        'origin_city_id' => null, 'origin_province' => 'Atlantis', 'origin_place' => 'Somewhere',
    ]))->assertSessionHasErrors('origin_province');

    $this->actingAs($driver)->post('/driver/rides', rideForm($vehicle, [
        'origin_city_id' => null, 'origin_province' => 'Leyte', 'origin_place' => 'Abuyog $$$ {drop}',
    ]))->assertSessionHasErrors('origin_place');

    $this->actingAs($driver)->post('/driver/rides', rideForm($vehicle, [
        'origin_city_id' => null, 'origin_province' => 'Leyte', 'origin_place' => 'Ormoc City',
        'destination_city_id' => City::where('name', 'Ormoc City')->first()->id,
    ]))->assertSessionHas('errors');

    expect(Ride::count())->toBe(0);
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

test('my rides page lists the passenger requests so the driver can answer them there', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $this->actingAs(Scenario::passenger())->post("/rides/{$ride->id}/book", Scenario::bookingForm())->assertSessionHasNoErrors();

    $this->actingAs($driver)->get('/driver/rides')->assertOk()->assertInertia(fn ($p) => $p
        ->component('driver/rides/index')
        ->where('pending_total', 1)
        ->has('requests', 1)
        ->where('requests.0.status', 'pending')
        ->where('rides.data.0.pending_requests', 1));

    // Another driver does not see them.
    $this->actingAs(Scenario::driver())->get('/driver/rides')->assertInertia(fn ($p) => $p->where('pending_total', 0)->has('requests', 0));
});

test('my rides and passenger requests list the newest travel day first and filter by a chosen date', function () {
    $driver = Scenario::driver();
    $vehicle = Scenario::vehicle($driver);
    $make = fn ($at) => Ride::create([
        'vehicle_id' => $vehicle->id,
        'origin_city_id' => City::where('name', 'Abuyog')->first()->id,
        'destination_city_id' => City::where('name', 'Ormoc City')->first()->id,
        'pickup_point' => 'x', 'departure_at' => $at, 'seats_offered' => 3, 'price_per_seat' => 100,
    ]);
    $early = $make(now()->addDays(2)->setTime(6, 0));
    $sameDayLater = $make(now()->addDays(2)->setTime(18, 0));   // published after $early
    $later = $make(now()->addDays(5)->setTime(9, 0));

    $this->actingAs($driver)->get('/driver/rides')->assertInertia(fn ($page) => $page
        ->where('rides.data.0.id', $later->id)            // newest day first
        ->where('rides.data.1.id', $sameDayLater->id)     // same day: most recently published first
        ->where('rides.data.2.id', $early->id));

    $day = now()->addDays(2)->format('Y-m-d');
    $this->actingAs($driver)->get("/driver/rides?date={$day}")->assertInertia(fn ($page) => $page->has('rides.data', 2));
    $this->actingAs($driver)->get('/driver/rides?date=not-a-date')->assertSessionHasErrors('date');
});

test('a driver can delete a schedule whose date already passed, but not an upcoming one', function () {
    $driver = Scenario::driver();
    $past = Scenario::ride($driver, ['departure_at' => now()->subDay()]);
    $future = Scenario::ride($driver, ['departure_at' => now()->addDay()]);

    $this->actingAs($driver)->get('/driver/rides')->assertInertia(fn ($page) => $page
        ->where('rides.data', fn ($rows) => collect($rows)->firstWhere('id', $past->id)['date_passed'] === true
            && collect($rows)->firstWhere('id', $future->id)['date_passed'] === false));

    $this->actingAs($driver)->delete("/driver/rides/{$future->id}")->assertSessionHasErrors();
    $this->actingAs($driver)->delete("/driver/rides/{$past->id}");

    expect(Ride::find($past->id))->toBeNull()->and(Ride::find($future->id))->not->toBeNull();
});
