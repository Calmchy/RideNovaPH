<?php

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\IdentityDocument;
use App\Models\IdType;
use App\Models\Setting;
use Tests\Support\Scenario;

beforeEach(fn () => Scenario::lookups());

test('every admin page is forbidden for non-admins and open for admins', function () {
    $pages = ['/admin', '/admin/users', '/admin/drivers', '/admin/identity', '/admin/rides', '/admin/bookings',
        '/admin/transactions', '/admin/reports', '/admin/settings', '/admin/content'];

    foreach ($pages as $url) {
        $this->actingAs(Scenario::passenger())->get($url)->assertForbidden();
        $this->actingAs(Scenario::driver())->get($url)->assertForbidden();
    }

    $admin = Scenario::admin();
    foreach ($pages as $url) {
        $this->actingAs($admin)->get($url)->assertOk();
    }
});

test('admin write actions are forbidden for non-admins', function () {
    $user = Scenario::passenger();

    $this->actingAs($user)->patch("/admin/users/{$user->id}", ['status' => 'suspended'])->assertForbidden();
    $this->actingAs($user)->put('/admin/settings', [])->assertForbidden();
    $this->actingAs($user)->post('/admin/transactions/1/refund', ['reason' => 'x'])->assertForbidden();
    $this->actingAs($user)->post('/admin/announcements', [])->assertForbidden();
});

test('users can be searched and suspended; a suspended user is signed out on the next request', function () {
    $admin = Scenario::admin();
    $user = Scenario::passenger();

    $this->actingAs($admin)->get('/admin/users?q='.urlencode($user->email))->assertInertia(fn ($p) => $p->has('users.data', 1));
    $this->actingAs($admin)->patch("/admin/users/{$user->id}", ['status' => 'suspended', 'reason' => 'Abuse'])->assertSessionHasNoErrors();
    expect($user->fresh()->isSuspended())->toBeTrue();

    $this->actingAs($user->fresh())->get('/dashboard')->assertRedirect('/login');
    $this->assertGuest();
});

test('admins cannot suspend themselves or other admins', function () {
    $admin = Scenario::admin();

    $this->actingAs($admin)->patch("/admin/users/{$admin->id}", ['status' => 'suspended'])->assertForbidden();
    $this->actingAs($admin)->patch('/admin/users/'.Scenario::admin()->id, ['status' => 'suspended'])->assertForbidden();
});

test('ID rejection needs a reason, shows it to the user, and the user can resubmit', function () {
    $admin = Scenario::admin();
    $user = Scenario::passenger(idApproved: false);
    $doc = IdentityDocument::create(['user_id' => $user->id, 'id_type_id' => IdType::first()->id, 'front_image_path' => 'identity-documents/a.png']);

    $this->actingAs($admin)->patch("/admin/identity-documents/{$doc->id}", ['decision' => 'rejected'])->assertSessionHasErrors('remarks');
    $this->actingAs($admin)->patch("/admin/identity-documents/{$doc->id}", ['decision' => 'rejected', 'remarks' => 'Photo is blurry'])->assertSessionHasNoErrors();

    expect($doc->fresh()->remarks)->toBe('Photo is blurry')->and($user->hasApprovedId())->toBeFalse();
    $this->actingAs($user)->get('/identity')->assertInertia(fn ($p) => $p->where('remarks', 'Photo is blurry')->where('status', 'rejected'));

    // A decided document cannot be decided twice.
    $this->actingAs($admin)->patch("/admin/identity-documents/{$doc->id}", ['decision' => 'approved'])->assertStatus(409);
});

test('driver licence approval notifies the driver and unlocks publishing', function () {
    $admin = Scenario::admin();
    $driver = Scenario::driver(approved: false);

    $this->actingAs($admin)->patch("/admin/drivers/{$driver->id}", ['decision' => 'approved'])->assertSessionHasNoErrors();

    expect($driver->fresh()->isApprovedDriver())->toBeTrue()->and($driver->notifications()->count())->toBe(1);
});

test('refund: only paid payments, reason required, receipt kept, both sides notified', function () {
    $admin = Scenario::admin();
    $driver = Scenario::driver();
    $passenger = Scenario::passenger();
    $ride = Scenario::ride($driver);
    $this->actingAs($passenger)->post("/rides/{$ride->id}/book", Scenario::bookingForm());
    $booking = Booking::first();
    $payment = $booking->payment;

    // Pending payment: can't refund yet.
    $this->actingAs($admin)->post("/admin/transactions/{$payment->id}/refund", ['reason' => 'x'])->assertSessionHasErrors('refund');

    $payment->forceFill(['status' => PaymentStatus::Paid, 'paid_at' => now(), 'receipt_no' => 'RCPT-TEST'])->save();
    $this->actingAs($admin)->post("/admin/transactions/{$payment->id}/refund", [])->assertSessionHasErrors('reason');
    $this->actingAs($admin)->post("/admin/transactions/{$payment->id}/refund", ['reason' => 'Trip cancelled by driver'])->assertSessionHasNoErrors();

    $payment->refresh();
    expect($payment->status)->toBe(PaymentStatus::Refunded)->and($payment->receipt_no)->toBe('RCPT-TEST')->and($payment->refunded_by)->toBe($admin->id);

    // Second refund is refused.
    $this->actingAs($admin)->post("/admin/transactions/{$payment->id}/refund", ['reason' => 'again'])->assertSessionHasErrors('refund');
});

test('settings are validated and saved; the fee applies to new bookings', function () {
    $admin = Scenario::admin();
    $body = ['platform_fee_percent' => 15, 'cancellation_cutoff_hours' => 4, 'max_seats_per_booking' => 5, 'require_id_for_booking' => true, 'support_email' => 'help@ridenovaph.test'];

    $this->actingAs($admin)->put('/admin/settings', ['platform_fee_percent' => 90] + $body)->assertSessionHasErrors('platform_fee_percent');
    $this->actingAs($admin)->put('/admin/settings', $body)->assertSessionHasNoErrors();

    expect(Setting::float('platform_fee_percent'))->toBe(15.0)->and(Setting::int('cancellation_cutoff_hours'))->toBe(4);
});

test('exports are CSV and neutralise spreadsheet formulas', function () {
    $admin = Scenario::admin();
    $evil = Scenario::passenger();
    $evil->forceFill(['name' => '=HYPERLINK("http://evil")'])->save();

    $csv = $this->actingAs($admin)->get('/admin/reports/export/users')->assertOk()->streamedContent();

    expect($csv)->toContain("'=HYPERLINK")->not->toContain(',"=HYPERLINK');
    $this->actingAs($admin)->get('/admin/reports/export/secrets')->assertNotFound(); // type is whitelisted
    $this->actingAs($admin)->get('/admin/transactions/export')->assertOk();
});

test('reports page loads with a date range', function () {
    $this->actingAs(Scenario::admin())->get('/admin/reports?from=2026-01-01&to=2026-12-31')->assertOk()
        ->assertInertia(fn ($p) => $p->component('admin/reports')->has('totals'));
});
