<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Owner's Terms & Conditions for renting a vehicle, and the copy each renter agreed to. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('vehicles', 'rental_terms')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->json('rental_terms')->nullable();
            });
        }
        if (! Schema::hasColumn('rental_requests', 'terms_snapshot')) {
            Schema::table('rental_requests', function (Blueprint $table) {
                // Frozen copy: later edits by the owner never change what this renter agreed to.
                $table->json('terms_snapshot')->nullable();
                $table->timestamp('terms_accepted_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('vehicles', 'rental_terms')) {
            Schema::table('vehicles', fn (Blueprint $t) => $t->dropColumn('rental_terms'));
        }
        foreach (['terms_snapshot', 'terms_accepted_at'] as $col) {
            if (Schema::hasColumn('rental_requests', $col)) {
                Schema::table('rental_requests', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }
    }
};
