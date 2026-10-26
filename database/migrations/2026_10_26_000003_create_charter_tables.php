<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Group charter ("rent the whole vehicle"):
 *  - charter_requests : the passenger's terms + the driver's price answer
 *  - charter_messages : the chat between those two people about ONE request
 *  - driver_profiles.available_for_hire : the driver's on/off switch for the "Hire a driver" banner
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->boolean('available_for_hire')->default(true);
        });

        Schema::create('charter_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 30)->unique();
            $table->foreignId('passenger_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained('vehicles');
            $table->unsignedSmallInteger('group_size');
            $table->string('pickup_location', 255);
            $table->string('dropoff_location', 255);
            $table->dateTime('pickup_at');
            $table->string('return_location', 255)->nullable();
            $table->dateTime('return_at')->nullable();
            $table->text('description')->nullable();
            // pending -> quoted -> accepted -> completed (or declined / cancelled along the way)
            $table->string('status', 20)->default('pending');
            $table->decimal('quoted_price', 10, 2)->nullable();   // the DRIVER decides this
            $table->string('driver_note', 500)->nullable();
            $table->string('reason', 255)->nullable();            // why declined / cancelled
            $table->timestamp('quoted_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('closed_at')->nullable();           // declined or cancelled
            $table->timestamps();

            $table->index(['driver_id', 'status']);
            $table->index(['passenger_id', 'status']);
        });

        Schema::create('charter_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('charter_request_id')->constrained('charter_requests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('body', 500);
            $table->timestamps();

            $table->index(['charter_request_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charter_messages');
        Schema::dropIfExists('charter_requests');
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->dropColumn('available_for_hire');
        });
    }
};
