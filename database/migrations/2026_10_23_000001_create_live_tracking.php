<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Live GPS tracking.
     *  live_locations : the LATEST position of each participant on a ride (one row per ride+user,
     *                   overwritten on every ping, so no movement history is kept). Rows are deleted
     *                   when the trip ends (privacy / Data Privacy Act data minimisation).
     *  bookings.driver_arrived_at : set when the driver reaches the passenger's pinned pick-up.
     */
    public function up(): void
    {
        Schema::create('live_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedSmallInteger('heading')->nullable();      // degrees 0-359
            $table->decimal('speed_kmh', 5, 1)->nullable();
            $table->unsignedInteger('accuracy_m')->nullable();
            $table->timestamp('recorded_at');
            $table->unique(['ride_id', 'user_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('driver_arrived_at')->nullable()->after('confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('driver_arrived_at');
        });
        Schema::dropIfExists('live_locations');
    }
};
