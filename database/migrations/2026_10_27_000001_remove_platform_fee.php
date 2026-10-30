<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Drivers keep 100% of the fare: the platform fee is set to 0%.
 *  - The admin setting `platform_fee_percent` becomes 0.
 *  - Payments that have NOT been collected yet (pending) are re-split so the driver gets the whole fare.
 *  - Payments already paid or refunded keep their original split, so past receipts and reports don't change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Setting::put('platform_fee_percent', '0');

        DB::table('payments')->where('status', 'pending')
            ->update(['platform_fee' => 0, 'driver_earnings' => DB::raw('amount')]);
    }

    public function down(): void
    {
        // Intentionally empty: the old percentage is not recoverable, and an admin can set one in Settings.
    }
};
