<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Admin-editable key/value settings (Admin > Settings).
 * Reads are cached; every write clears the cache. If a key was never saved,
 * the default below is used, so the app works before anyone opens the page.
 */
class Setting extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    /** @var array<string, string> */
    public const DEFAULTS = [
        'platform_fee_percent' => '10',        // % of each fare kept by the platform
        'cancellation_cutoff_hours' => '2',    // passengers can't cancel closer to departure than this
        'max_seats_per_booking' => '6',
        'require_id_for_booking' => '1',       // 1 = approved ID needed to reserve (proposal rule)
        'support_email' => 'support@ridenovaph.test',
    ];

    public static function get(string $key, ?string $default = null): ?string
    {
        $all = Cache::rememberForever('settings', fn () => static::pluck('value', 'key')->all());

        return $all[$key] ?? $default ?? (self::DEFAULTS[$key] ?? null);
    }

    public static function float(string $key): float
    {
        return (float) static::get($key);
    }

    public static function int(string $key): int
    {
        return (int) static::get($key);
    }

    public static function bool(string $key): bool
    {
        return static::get($key) === '1';
    }

    public static function put(string $key, string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('settings');
    }

    /** @return array<string, string> every setting, defaults filled in */
    public static function all_(): array
    {
        return array_merge(self::DEFAULTS, Cache::rememberForever('settings', fn () => static::pluck('value', 'key')->all()));
    }
}
