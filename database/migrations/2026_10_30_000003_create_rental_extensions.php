<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A renter's request to keep the vehicle for more days; the owner accepts or declines. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rental_extensions')) {
            return;
        }

        Schema::create('rental_extensions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_request_id')->constrained('rental_requests')->cascadeOnDelete();
            $table->unsignedSmallInteger('days');
            // Snapshot: the owner's daily rate on the rental x the extra days, and the return time it would give.
            $table->decimal('extra_price', 12, 2);
            $table->dateTime('old_end_at');
            $table->dateTime('new_end_at');
            $table->enum('status', ['pending', 'approved', 'declined'])->default('pending');
            $table->string('reason', 255)->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index(['rental_request_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_extensions');
    }
};
