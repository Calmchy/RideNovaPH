<?php

use App\Models\Role;
use App\Models\User;

// Guards for the rules in the proposal: ID images and the admin panel are admin-only.

test('guests are sent to login from the admin panel', function () {
    $this->get('/admin')->assertRedirect(route('login'));
});

test('passengers cannot open the admin panel', function () {
    $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
});

test('drivers cannot open the admin panel', function () {
    $driver = User::factory()->create(['role_id' => Role::DRIVER]);

    $this->actingAs($driver)->get('/admin')->assertForbidden();
});

test('admins can open the admin panel', function () {
    $admin = User::factory()->create(['role_id' => Role::ADMIN]);

    $this->actingAs($admin)->get('/admin')->assertOk();
});

test('passengers cannot decide on ID documents or manage banners', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patch('/admin/identity-documents/1', ['decision' => 'approved'])->assertForbidden();
    $this->actingAs($user)->post('/admin/banners', [])->assertForbidden();
});

test('public pages load for guests', function () {
    $this->get('/')->assertOk();
    // /rides is now merged into the single "Bookings" hub.
    $this->get('/rides')->assertRedirect('/bookings');
});

test('booking actions require a signed-in user', function () {
    $this->post('/rides/1/book', ['seats' => 1])->assertRedirect(route('login'));
    $this->get('/bookings')->assertRedirect(route('login'));
});
