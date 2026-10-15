<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cancellation fee snapshot on the payment row.
     *   cancellation_fee : peso amount charged when a passenger cancels AFTER the driver approved
     *   fee_status       : none | due | paid | waived   (an unpaid "due" fee blocks new bookings)
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('cancellation_fee', 10, 2)->default(0)->after('driver_earnings');
            $table->string('fee_status', 10)->default('none')->after('cancellation_fee');
            $table->timestamp('fee_settled_at')->nullable()->after('fee_status');
            $table->index('fee_status');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['fee_status']);
            $table->dropColumn(['cancellation_fee', 'fee_status', 'fee_settled_at']);
        });
    }
};
