<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Vehicle photo banner: three required views (front, back, interior) plus a driver-written description. */
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            // Nullable so vehicles registered before this update keep working until the driver adds photos.
            $table->string('photo_front_path')->nullable()->after('manufacture_year');
            $table->string('photo_back_path')->nullable()->after('photo_front_path');
            $table->string('photo_interior_path')->nullable()->after('photo_back_path');
            $table->string('description', 500)->nullable()->after('photo_interior_path');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['photo_front_path', 'photo_back_path', 'photo_interior_path', 'description']);
        });
    }
};
