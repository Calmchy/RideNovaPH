<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The name and contact number the passenger types when asking a driver for a group trip. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('charter_requests', 'passenger_name')) {
            Schema::table('charter_requests', fn (Blueprint $t) => $t->string('passenger_name', 255)->nullable());
        }
        if (! Schema::hasColumn('charter_requests', 'passenger_phone')) {
            Schema::table('charter_requests', fn (Blueprint $t) => $t->string('passenger_phone', 30)->nullable());
        }
    }

    public function down(): void
    {
        foreach (['passenger_name', 'passenger_phone'] as $col) {
            if (Schema::hasColumn('charter_requests', $col)) {
                Schema::table('charter_requests', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }
    }
};
