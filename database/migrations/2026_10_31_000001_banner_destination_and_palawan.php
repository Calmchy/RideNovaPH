<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 1. A banner can name its destination town. Drivers who open the banner get a publish-a-ride form
 *    with that destination already chosen.
 * 2. Adds Palawan (Puerto Princesa City) so the Palawan banner has a destination to point at.
 * Safe to re-run.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('banners', 'city_id')) {
            Schema::table('banners', function (Blueprint $table) {
                $table->foreignId('city_id')->nullable()->constrained('cities')->nullOnDelete();
            });
        }

        $provinceId = DB::table('provinces')->where('name', 'Palawan')->value('id')
            ?? DB::table('provinces')->insertGetId(['name' => 'Palawan']);

        $exists = DB::table('cities')->where('province_id', $provinceId)->where('name', 'Puerto Princesa City')->exists();

        if (! $exists) {
            $row = ['province_id' => $provinceId, 'name' => 'Puerto Princesa City'];

            if (Schema::hasColumn('cities', 'latitude')) {
                $row += ['latitude' => 9.7392, 'longitude' => 118.7353];
            }

            DB::table('cities')->insert($row);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('banners', 'city_id')) {
            Schema::table('banners', function (Blueprint $table) {
                $table->dropConstrainedForeignId('city_id');
            });
        }
    }
};
