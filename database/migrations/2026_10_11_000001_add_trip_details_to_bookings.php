<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Option A from the team's DB report: ONE bookings table. The "Review & Reserve"
 * form details (contact + pick-up/return place and time, with map coordinates) are
 * added to the existing table instead of creating a second `bookings` table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('contact_name', 120)->nullable()->after('seats_booked');
            $table->string('contact_address', 255)->nullable();
            $table->string('contact_email', 190)->nullable();
            $table->string('contact_phone', 20)->nullable();
            $table->string('pickup_location', 255)->nullable();
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();
            $table->dateTime('pickup_at')->nullable();
            $table->string('return_location', 255)->nullable();
            $table->decimal('return_lat', 10, 7)->nullable();
            $table->decimal('return_lng', 10, 7)->nullable();
            $table->dateTime('return_at')->nullable();
        });

        // City centres so the map can open on the right place.
        Schema::table('cities', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('cities', fn (Blueprint $t) => $t->dropColumn(['latitude', 'longitude']));
        Schema::table('bookings', fn (Blueprint $t) => $t->dropColumn([
            'contact_name', 'contact_address', 'contact_email', 'contact_phone',
            'pickup_location', 'pickup_lat', 'pickup_lng', 'pickup_at',
            'return_location', 'return_lat', 'return_lng', 'return_at',
        ]));
    }
};
