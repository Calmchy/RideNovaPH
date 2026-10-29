<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The "trip description" a driver writes can be longer than the old 255-character notes column.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->text('notes')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->string('notes')->nullable()->change();
        });
    }
};
