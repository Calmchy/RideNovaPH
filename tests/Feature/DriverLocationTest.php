<?php

use App\Models\City;
use App\Models\Ride;
use Tests\Support\Scenario;

beforeEach(fn () => Scenario::lookups());

function locForm($vehicle, array $o = []): array
{
    return $o + [
        'vehicle_id' => $vehicle->id,
        'origin_city_id' => City::where('name', 'Abuyog')->first()->id,
        'destination_city_id' => City::where('name', 'Ormoc City')->first()->id,
        'pickup_point' => 'Terminal', 'departure_at' => now()->addDays(2)->format('Y-m-d\TH:i'),
        'seats_offered' => 3, 'price_per_seat' => 300,
    ];
}

/** A completed trip Abuyog -> Tacloban City, so the driver "arrived" in Tacloban City. */
function arriveInTacloban($driver): Ride
{
    $ride = Scenario::ride($driver, ['departure_at' => now()->addDay()]);
    test()->actingAs($driver)->patch("/driver/rides/{$ride->id}/start")->assertSessionHasNoErrors();
    test()->actingAs($driver)->patch("/driver/rides/{$ride->id}/complete")->assertSessionHasNoErrors();

    return $ride->fresh();
}

test('a driver who has not completed a trip can start from anywhere', function () {
    $driver = Scenario::driver();
    $vehicle = Scenario::vehicle($driver);

    $this->actingAs($driver)->post('/driver/rides', locForm($vehicle))->assertSessionHasNoErrors();
    $this->actingAs($driver)->get('/driver/rides/create')->assertInertia(fn ($page) => $page->where('arrival', null));
});

test('after arriving, the next ride must start from the arrival town', function () {
    $driver = Scenario::driver();
    $trip = arriveInTacloban($driver);
    $vehicle = $trip->vehicle;
    $tacloban = City::where('name', 'Tacloban City')->first();
    $rides = Ride::count();

    // From somewhere else (the old default of Abuyog) is refused.
    $this->actingAs($driver)->post('/driver/rides', locForm($vehicle))
        ->assertSessionHasErrors('origin_city_id');
    // So is typing a different town.
    $this->actingAs($driver)->post('/driver/rides', locForm($vehicle, ['origin_city_id' => null, 'origin_province' => 'Leyte', 'origin_place' => 'Dulag']))
        ->assertSessionHasErrors('origin_city_id');
    expect(Ride::count())->toBe($rides);

    // From the arrival town (picked, or typed with the same name) works.
    $this->actingAs($driver)->post('/driver/rides', locForm($vehicle, ['origin_city_id' => $tacloban->id]))->assertSessionHasNoErrors();
    $this->actingAs($driver)->post('/driver/rides', locForm($vehicle, ['origin_city_id' => null, 'origin_province' => $tacloban->province->name, 'origin_place' => 'tacloban city']))
        ->assertSessionHasNoErrors();
    expect(Ride::count())->toBe($rides + 2);

    // The form is told where the driver is, so it can lock the From field.
    $this->actingAs($driver)->get('/driver/rides/create')
        ->assertInertia(fn ($page) => $page->where('arrival.name', 'Tacloban City')->where('arrival.city_id', $tacloban->id));
});

test('the latest completed trip decides where the driver is', function () {
    $driver = Scenario::driver();
    arriveInTacloban($driver);

    // A second trip Tacloban -> Ormoc, completed later: now the driver is in Ormoc City.
    $tacloban = City::where('name', 'Tacloban City')->first();
    $ormoc = City::where('name', 'Ormoc City')->first();
    $second = Scenario::ride($driver, ['origin_city_id' => $tacloban->id, 'destination_city_id' => $ormoc->id, 'departure_at' => now()->addDay()]);
    $this->actingAs($driver)->patch("/driver/rides/{$second->id}/start");
    $this->actingAs($driver)->patch("/driver/rides/{$second->id}/complete");

    $this->actingAs($driver)->get('/driver/rides/create')->assertInertia(fn ($page) => $page->where('arrival.name', 'Ormoc City'));
    $this->actingAs($driver)->post('/driver/rides', locForm($second->vehicle, ['origin_city_id' => $tacloban->id]))->assertSessionHasErrors('origin_city_id');
    $this->actingAs($driver)->post('/driver/rides', locForm($second->vehicle, ['origin_city_id' => $ormoc->id, 'destination_city_id' => $tacloban->id]))->assertSessionHasNoErrors();
});

test('editing an older ride is fine unless its starting place is changed', function () {
    $driver = Scenario::driver();
    $old = Scenario::ride($driver, ['departure_at' => now()->addDays(5)]); // published from Abuyog earlier
    arriveInTacloban($driver);

    $form = locForm($old->vehicle, [
        'origin_city_id' => $old->origin_city_id, 'destination_city_id' => $old->destination_city_id, 'price_per_seat' => 250,
        'departure_at' => $old->departure_at->format('Y-m-d\TH:i'),
    ]);
    $this->actingAs($driver)->patch("/driver/rides/{$old->id}", $form)->assertSessionHasNoErrors();
    expect((float) $old->fresh()->price_per_seat)->toBe(250.0);

    // Moving it to another start (not the arrival town) is refused.
    $this->actingAs($driver)->patch("/driver/rides/{$old->id}", $form + ['origin_city_id' => City::where('name', 'Naval')->first()->id])
        ->assertSessionHasErrors('origin_city_id');
});
