<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Message status ("Sent" / "Delivered" / "Seen") and who is online.
 *  - users.last_seen_at            : last time the person had the site open
 *  - direct_messages.delivered_at  : when the message reached the other person's device
 * Safe to re-run.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'last_seen_at')) {
            Schema::table('users', fn (Blueprint $t) => $t->timestamp('last_seen_at')->nullable());
        }

        if (! Schema::hasColumn('direct_messages', 'delivered_at')) {
            Schema::table('direct_messages', function (Blueprint $t) {
                $t->timestamp('delivered_at')->nullable();
                $t->index(['recipient_id', 'delivered_at']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('direct_messages', 'delivered_at')) {
            Schema::table('direct_messages', function (Blueprint $t) {
                $t->dropIndex(['recipient_id', 'delivered_at']);
                $t->dropColumn('delivered_at');
            });
        }

        if (Schema::hasColumn('users', 'last_seen_at')) {
            Schema::table('users', fn (Blueprint $t) => $t->dropColumn('last_seen_at'));
        }
    }
};
