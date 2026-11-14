<?php

use Tests\Support\Scenario;

it('saves and removes a default place', function () {
    $user = Scenario::passenger();

    $this->actingAs($user)->post('/settings/default-place', ['province' => 'Cebu', 'place' => 'Cebu City'])->assertRedirect();
    expect($user->fresh()->default_place)->toBe('Cebu City')->and($user->fresh()->default_province)->toBe('Cebu');

    $this->actingAs($user)->delete('/settings/default-place')->assertRedirect();
    expect($user->fresh()->default_place)->toBeNull();
});

it('starts the booking search From with the default, unless cleared on purpose', function () {
    $user = Scenario::passenger();
    $user->forceFill(['default_province' => 'Cebu', 'default_place' => 'Cebu City'])->save();

    $this->actingAs($user)->get('/bookings')
        ->assertInertia(fn ($p) => $p->where('filters.origin_place', 'Cebu City')->where('default_place.place', 'Cebu City'));

    $this->actingAs($user)->get('/bookings?origin_any=1')
        ->assertInertia(fn ($p) => $p->missing('filters.origin_place'));
});
