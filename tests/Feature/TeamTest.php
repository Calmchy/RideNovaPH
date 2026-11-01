<?php

use App\Models\TeamMember;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\Scenario;

// "The Team Behind RideNova PH" cards on the About page; only the admin can edit them.

beforeEach(function () {
    Scenario::lookups();
    TeamMember::query()->delete(); // the migration seeds the real three; tests start clean
    foreach (['Geonard G. Pagaduan', 'John Paul A. Lelis', 'Chyril S. Manatad'] as $i => $n) {
        TeamMember::create(['name' => $n, 'role_title' => 'Member', 'description' => 'Hi', 'sort_order' => $i + 1]);
    }
});

test('the about page lists the three team members', function () {
    $this->actingAs(Scenario::passenger())->get('/about')->assertOk()
        ->assertInertia(fn (Assert $p) => $p->component('about')->has('team', 3)->where('team.0.name', 'Geonard G. Pagaduan'));
});

test('only an admin can edit a team card', function () {
    $m = TeamMember::first();

    $this->actingAs(Scenario::passenger())->post("/admin/team/{$m->id}", ['name' => 'Hacked', 'role_title' => 'x'])->assertForbidden();
    expect($m->fresh()->name)->toBe('Geonard G. Pagaduan');
});

test('the admin changes the text and the picture, and the old picture is removed', function () {
    Storage::fake('public');
    $admin = Scenario::admin();
    $m = TeamMember::first();

    $this->actingAs($admin)->post("/admin/team/{$m->id}", [
        'name' => 'Geonard Pagaduan', 'role_title' => 'Leader', 'description' => '<b>Leads</b> the team.',
        'photo' => UploadedFile::fake()->image('a.jpg', 300, 300),
    ])->assertSessionHasNoErrors();

    $m->refresh();
    expect($m->name)->toBe('Geonard Pagaduan')->and($m->description)->toBe('Leads the team.')->and($m->photo_path)->not->toBeNull();
    Storage::disk('public')->assertExists($m->photo_path);
    $old = $m->photo_path;

    $this->actingAs($admin)->post("/admin/team/{$m->id}", ['name' => 'Geonard Pagaduan', 'role_title' => 'Leader', 'remove_photo' => true])->assertSessionHasNoErrors();
    Storage::disk('public')->assertMissing($old);
    expect($m->fresh()->photo_path)->toBeNull();

    // Only images are accepted.
    $this->actingAs($admin)->post("/admin/team/{$m->id}", ['name' => 'x', 'role_title' => 'y', 'photo' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')])->assertSessionHasErrors('photo');
});
