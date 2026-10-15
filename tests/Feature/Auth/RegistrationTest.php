<?php

use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'middle_initial' => 'a',
        'account_type' => 'passenger',
        'email' => 'test@example.com',
        'password' => 'Str0ng-Passw0rd!',
        'password_confirmation' => 'Str0ng-Passw0rd!',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
    expect(auth()->user()->name)->toBe('Juan A. Dela Cruz');
});

test('first name, last name, email and account type are required and cannot be blank', function () {
    $this->post(route('register.store'), [
        'first_name' => '   ',
        'last_name' => '',
        'email' => '',
        'password' => 'Str0ng-Passw0rd!',
        'password_confirmation' => 'Str0ng-Passw0rd!',
    ])->assertSessionHasErrors(['first_name', 'last_name', 'email', 'account_type']);

    $this->assertGuest();
});

test('middle initial must be a single letter', function () {
    $this->post(route('register.store'), [
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'middle_initial' => 'AB',
        'account_type' => 'passenger',
        'email' => 'test@example.com',
        'password' => 'Str0ng-Passw0rd!',
        'password_confirmation' => 'Str0ng-Passw0rd!',
    ])->assertSessionHasErrors('middle_initial');
});

test('password must contain a special character', function (string $password) {
    $this->post(route('register.store'), [
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'account_type' => 'driver',
        'email' => 'test@example.com',
        'password' => $password,
        'password_confirmation' => $password,
    ])->assertSessionHasErrors('password');

    $this->assertGuest();
})->with([
    'no special character' => 'Passw0rdNoSymbol',
    'no number' => 'Password-NoNumber!',
    'no uppercase' => 'passw0rd-lower!',
    'too short' => 'Aa1!aa',
]);