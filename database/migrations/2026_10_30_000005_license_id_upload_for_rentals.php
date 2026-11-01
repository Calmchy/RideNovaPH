<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Renters now upload a photo of their licence ID instead of typing the number. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('rental_requests', 'license_id_path')) {
            Schema::table('rental_requests', function (Blueprint $table) {
                $table->string('license_id_path', 255)->nullable();
            });
        }

        // The number is no longer asked for (older requests keep theirs).
        Schema::table('rental_requests', function (Blueprint $table) {
            $table->text('license_number')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('rental_requests', 'license_id_path')) {
            Schema::table('rental_requests', fn (Blueprint $t) => $t->dropColumn('license_id_path'));
        }
    }
};
