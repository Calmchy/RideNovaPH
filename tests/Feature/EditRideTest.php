<?php

use App\Models\Announcement;
use App\Models\AnnouncementCategory;
use App\Models\Booking;
use App\Models\Ride;
use Tests\Support\Scenario;

// A driver can edit their own ride; what is editable depends on whether passengers have booked.

beforeEach(fn () => Scenario::lookups());

function editRideForm(Ride $ride, array $over = []): array
{
    return array_merge([
        'vehicle_id' => $ride->vehicle_id,
        'origin_city_id' => $ride->origin_city_id,
        'destination_city_id' => $ride->destination_city_id,
        'pickup_point' => $ride->pickup_point,
        'dropoff_point' => $ride->dropoff_point,
        'departure_at' => $ride->departure_at->format('Y-m-d H:i:s'),
        'seats_offered' => $ride->seats_offered,
        'price_per_seat' => $ride->price_per_seat,
        'notes' => 'Meet at the terminal gate.',
    ], $over);
}

test('a driver can edit the description of their own ride', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['notes' => 'One small bag per person.']))
        ->assertSessionHasNoErrors();

    expect($ride->fresh()->notes)->toBe('One small bag per person.');
});

test('a long description of up to 1000 characters is accepted, longer is rejected', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['notes' => str_repeat('a', 1000)]))->assertSessionHasNoErrors();
    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['notes' => str_repeat('a', 1001)]))->assertSessionHasErrors('notes');
});

test('another driver cannot edit my ride', function () {
    $ride = Scenario::ride(Scenario::driver());

    $this->actingAs(Scenario::driver())->get("/driver/rides/{$ride->id}/edit")->assertForbidden();
    $this->actingAs(Scenario::driver())->patch("/driver/rides/{$ride->id}", editRideForm($ride))->assertForbidden();
});

test('before anyone books, the price can change', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['price_per_seat' => 250]))->assertSessionHasNoErrors();

    expect((float) $ride->fresh()->price_per_seat)->toBe(250.0);
});

test('once a passenger has booked, price and pick-up are locked but the description is not', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $this->actingAs(Scenario::passenger())->post("/rides/{$ride->id}/book", Scenario::bookingForm())->assertSessionHasNoErrors();
    $oldPrice = (float) $ride->fresh()->price_per_seat;

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['price_per_seat' => $oldPrice + 100]))
        ->assertSessionHasErrors('price_per_seat');
    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['pickup_point' => 'Somewhere else']))
        ->assertSessionHasErrors('pickup_point');
    expect((float) $ride->fresh()->price_per_seat)->toBe($oldPrice);

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['notes' => 'Updated note']))->assertSessionHasNoErrors();
    expect($ride->fresh()->notes)->toBe('Updated note');
});

test('seats cannot drop below the seats already booked, and passengers are notified of changes', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $passenger = Scenario::passenger();
    $this->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm(['seats' => 2]))->assertSessionHasNoErrors();
    $before = $passenger->notifications()->count();

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['seats_offered' => 1]))->assertSessionHasErrors('seats_offered');

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['notes' => 'New meeting detail']))->assertSessionHasNoErrors();
    expect($passenger->notifications()->count())->toBe($before + 1);
});

test('a started ride cannot be edited', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);
    $ride->forceFill(['started_at' => now()])->save();

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride))->assertSessionHasErrors('trip');
});

test('the event list shows only event names and includes every published announcement', function () {
    $driver = Scenario::driver();
    $cat = AnnouncementCategory::first() ?? AnnouncementCategory::create(['name' => 'Exam']);
    Announcement::create(['category_id' => $cat->id, 'created_by' => Scenario::admin()->id, 'title' => 'TESDA NC II Assessment — Maasin', 'body' => 'x', 'exam_date' => now()->addDays(5), 'is_published' => true]);
    Announcement::create(['category_id' => $cat->id, 'created_by' => Scenario::admin()->id, 'title' => 'Fiesta Notice', 'body' => 'x', 'exam_date' => null, 'is_published' => true]);
    Announcement::create(['category_id' => $cat->id, 'created_by' => Scenario::admin()->id, 'title' => 'Hidden draft', 'body' => 'x', 'exam_date' => null, 'is_published' => false]);

    $titles = collect($this->actingAs($driver)->get('/driver/rides/create')->viewData('page')['props']['announcements'])->pluck('title');

    expect($titles)->toContain('TESDA NC II Assessment')->toContain('Fiesta Notice')
        ->not->toContain('TESDA NC II Assessment — Maasin')->not->toContain('Hidden draft');
});

test('a driver can publish a ride with their own event name, which replaces a picked announcement', function () {
    $driver = Scenario::driver();
    $ride = Scenario::ride($driver);

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['event_name' => '<b>Brgy. Fiesta Trip</b>']))
        ->assertSessionHasNoErrors();

    $fresh = $ride->fresh();
    expect($fresh->event_name)->toBe('Brgy. Fiesta Trip')   // tags stripped
        ->and($fresh->announcement_id)->toBeNull()
        ->and($fresh->eventLabel())->toBe('Brgy. Fiesta Trip');

    $this->actingAs($driver)->patch("/driver/rides/{$ride->id}", editRideForm($ride, ['event_name' => str_repeat('x', 121)]))
        ->assertSessionHasErrors('event_name');
});
