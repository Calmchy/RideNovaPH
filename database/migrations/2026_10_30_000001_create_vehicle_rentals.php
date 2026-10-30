<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Self-drive vehicle rental: owner switch + daily rate on vehicles, and the renter's requests. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('vehicles', 'available_for_rent')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->boolean('available_for_rent')->default(false);
            });
        }
        if (! Schema::hasColumn('vehicles', 'daily_rate')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->decimal('daily_rate', 10, 2)->nullable();
            });
        }

        if (! Schema::hasTable('rental_requests')) {
            Schema::create('rental_requests', function (Blueprint $table) {
                $table->id();
                $table->string('reference_no', 25)->unique();
                $table->foreignId('renter_id')->constrained('users');
                $table->foreignId('owner_id')->constrained('users');
                $table->foreignId('vehicle_id')->constrained('vehicles');
                // Renter info the owner asked for (license number is stored encrypted).
                $table->string('renter_name', 120);
                $table->string('renter_phone', 30);
                $table->string('renter_address', 255);
                $table->text('license_number');
                $table->date('license_expiry');
                // When and where.
                $table->dateTime('start_at');
                $table->dateTime('end_at');
                $table->string('pickup_location', 255);
                $table->string('return_location', 255);
                $table->text('purpose')->nullable();
                // Price snapshot: the owner's daily rate AT THE TIME of the request, so later edits don't change it.
                $table->unsignedSmallInteger('days');
                $table->decimal('daily_rate', 10, 2);
                $table->decimal('total_price', 12, 2);
                $table->enum('status', ['pending', 'approved', 'completed', 'declined', 'cancelled'])->default('pending');
                $table->string('owner_note', 500)->nullable();
                $table->string('reason', 255)->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamp('closed_at')->nullable();
                $table->timestamps();

                $table->index(['renter_id', 'status']);
                $table->index(['owner_id', 'status']);
                $table->index(['vehicle_id', 'status', 'start_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_requests');
        foreach (['available_for_rent', 'daily_rate'] as $col) {
            if (Schema::hasColumn('vehicles', $col)) {
                Schema::table('vehicles', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }
    }
};
