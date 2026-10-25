<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->unique()->constrained('bookings')->cascadeOnDelete();
            $table->string('receipt_no', 25)->nullable()->unique(); // issued when paid
            $table->string('method', 20)->default('cash');          // v1: cash on ride
            $table->string('status', 12)->default('pending');       // pending|paid|refunded|void
            $table->decimal('amount', 10, 2);
            $table->decimal('platform_fee', 10, 2);
            $table->decimal('driver_earnings', 10, 2);
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('refund_reason')->nullable();
            $table->foreignId('refunded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
