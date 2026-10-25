<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Driver licence BACK photo and the vehicle's COR (Certificate of Registration).
     * Both are nullable so rows created before this update keep working; both live on the PRIVATE disk.
     * (users.profile_photo_path already exists from the carpool columns migration.)
     */
    public function up(): void
    {
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->string('license_back_image_path')->nullable()->after('license_image_path');
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('cor_image_path')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', fn (Blueprint $t) => $t->dropColumn('cor_image_path'));
        Schema::table('driver_profiles', fn (Blueprint $t) => $t->dropColumn('license_back_image_path'));
    }
};
