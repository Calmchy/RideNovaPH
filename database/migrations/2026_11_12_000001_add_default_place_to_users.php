<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A user's default place (province + town): pre-fills "From" when finding a ride and when publishing one. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'default_province')) {
                $table->string('default_province', 80)->nullable();
            }

            if (! Schema::hasColumn('users', 'default_place')) {
                $table->string('default_place', 80)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['default_province', 'default_place']));
    }
};
