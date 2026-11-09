<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The vehicle's VIN (17 characters), asked when an owner publishes the unit for rent. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('vehicles', 'vin')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->string('vin', 17)->nullable()->unique()->after('plate_number');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('vehicles', 'vin')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->dropUnique(['vin']);
                $table->dropColumn('vin');
            });
        }
    }
};
