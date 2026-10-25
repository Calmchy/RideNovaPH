<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Editable profile data (every role) + emergency contact (passenger safety).
        Schema::table('users', function (Blueprint $table) {
            $table->string('address', 255)->nullable()->after('phone_number');
            $table->string('emergency_contact_name', 120)->nullable()->after('address');
            $table->string('emergency_contact_phone', 20)->nullable()->after('emergency_contact_name');
        });

        // Driver-only settings.
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->string('bio', 280)->nullable();
            $table->boolean('allows_luggage')->default(true);
        });

        // Trip status = derived from these timestamps + rides.status (open/completed/cancelled):
        //   open + no started_at  -> scheduled     open + started_at -> on the road
        // (We avoid altering the status enum: it is awkward on SQLite.)
        Schema::table('rides', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('rides', fn (Blueprint $t) => $t->dropColumn(['started_at', 'completed_at', 'cancelled_at', 'cancellation_reason']));
        Schema::table('driver_profiles', fn (Blueprint $t) => $t->dropColumn(['bio', 'allows_luggage']));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['address', 'emergency_contact_name', 'emergency_contact_phone']));
    }
};
