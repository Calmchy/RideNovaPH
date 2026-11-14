<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin review of a registered vehicle (photos + COR). Existing vehicles default to "approved" so nothing
 * breaks; the registration form sets new ones to "pending". Safe to re-run.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'review_status')) {
                $table->string('review_status', 20)->default('approved')->index();
            }

            if (! Schema::hasColumn('vehicles', 'review_remarks')) {
                $table->string('review_remarks')->nullable();
            }

            if (! Schema::hasColumn('vehicles', 'reviewed_by')) {
                $table->unsignedBigInteger('reviewed_by')->nullable();
            }

            if (! Schema::hasColumn('vehicles', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['review_status', 'review_remarks', 'reviewed_by', 'reviewed_at']);
        });
    }
};
