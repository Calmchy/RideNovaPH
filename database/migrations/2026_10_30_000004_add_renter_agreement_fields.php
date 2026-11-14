<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Safety details the renter fills in with the owner's terms (age, licence type, emergency contact, signature...). Safe to re-run. */
return new class extends Migration
{
    private const COLUMNS = [
        'birth_date' => 'text',            // stored encrypted by the model
        'license_type' => 'string:20',
        'driving_years' => 'tinyint',
        'passenger_count' => 'tinyint',
        'emergency_name' => 'string:120',
        'emergency_phone' => 'string:30',
        'destination' => 'string:255',
        'additional_drivers' => 'text',
        'signature_name' => 'string:120',
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as $name => $type) {
            if (Schema::hasColumn('rental_requests', $name)) {
                continue;
            }
            Schema::table('rental_requests', function (Blueprint $table) use ($name, $type) {
                match (true) {
                    $type === 'text' => $table->text($name)->nullable(),
                    $type === 'tinyint' => $table->unsignedTinyInteger($name)->nullable(),
                    default => $table->string($name, (int) explode(':', $type)[1])->nullable(),
                };
            });
        }
    }

    public function down(): void
    {
        foreach (array_keys(self::COLUMNS) as $name) {
            if (Schema::hasColumn('rental_requests', $name)) {
                Schema::table('rental_requests', fn (Blueprint $t) => $t->dropColumn($name));
            }
        }
    }
};
