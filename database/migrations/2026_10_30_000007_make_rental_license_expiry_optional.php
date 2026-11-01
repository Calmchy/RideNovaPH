<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Renters no longer type a licence expiry date (the owner reads it from the uploaded licence ID). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_requests', function (Blueprint $table) {
            $table->date('license_expiry')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Left nullable on purpose: rows created without a date can't be made required again.
    }
};
