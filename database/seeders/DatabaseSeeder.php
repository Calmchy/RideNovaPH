<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(LookupSeeder::class);

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Local convenience only: never seed a known admin password in production.
        if (app()->environment('local')) {
            User::factory()->create([
                'role_id' => Role::ADMIN,
                'name' => 'RideNovaPH Admin',
                'email' => 'admin@ridenovaph.test',
            ]);

            // Demo driver, passenger, rides and announcements (local only).
            $this->call(DemoSeeder::class);
        }

        if (env('ADMIN_EMAIL') && env('ADMIN_PASSWORD')) {
            $admin = \App\Models\User::firstOrNew(['email' => env('ADMIN_EMAIL')]);
            $admin->forceFill([
                'name' => 'Administrator',
                'password' => \Illuminate\Support\Facades\Hash::make(env('ADMIN_PASSWORD')),
                'role_id' => \App\Models\Role::ADMIN,
                'email_verified_at' => now(),
            ])->save();
        }
    }
}
