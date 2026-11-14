<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Emergency contact: relationship and address, in case the person can't be reached by phone. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('rental_requests', 'emergency_relationship')) {
            Schema::table('rental_requests', fn (Blueprint $t) => $t->string('emergency_relationship', 50)->nullable());
        }
        if (! Schema::hasColumn('rental_requests', 'emergency_address')) {
            Schema::table('rental_requests', fn (Blueprint $t) => $t->string('emergency_address', 255)->nullable());
        }
    }

    public function down(): void
    {
        foreach (['emergency_relationship', 'emergency_address'] as $col) {
            if (Schema::hasColumn('rental_requests', $col)) {
                Schema::table('rental_requests', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }
    }
};
