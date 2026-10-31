<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** "The Team Behind RideNova PH" cards on the About page. The admin edits the photo and text. Safe to re-run. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('team_members')) {
            Schema::create('team_members', function (Blueprint $t) {
                $t->id();
                $t->string('name', 120);
                $t->string('role_title', 120);
                $t->text('description')->nullable();
                $t->string('photo_path')->nullable();
                $t->unsignedSmallInteger('sort_order')->default(0);
                $t->timestamps();
            });
        }

        if (DB::table('team_members')->count() === 0) {
            $now = now();
            DB::table('team_members')->insert([
                ['name' => 'Geonard G. Pagaduan', 'role_title' => 'Team Leader', 'description' => 'Leads the RideNovaPH team and keeps the project moving from idea to launch.', 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'John Paul A. Lelis', 'role_title' => 'Team Member', 'description' => 'Helps build and test RideNovaPH so every trip is easy to find and book.', 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Chyril S. Manatad', 'role_title' => 'Team Member', 'description' => 'Helps design and polish RideNovaPH so it feels simple and friendly to use.', 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
