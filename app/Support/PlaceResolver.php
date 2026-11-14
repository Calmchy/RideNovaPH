<?php

namespace App\Support;

use App\Models\City;
use App\Models\Province;

/**
 * The Philippine provinces and towns the "Publish a ride" picker offers (database/data/ph-places.json),
 * plus turning a typed "province + place" into a City row. Rows are created only when a driver actually
 * uses a place, so the cities table never fills with towns nobody rides to.
 */
class PlaceResolver
{
    /** @var array<int, array{name: string, towns: array<int, string>}>|null */
    private static ?array $cache = null;

    /** @return array<int, array{name: string, towns: array<int, string>}> */
    public static function all(): array
    {
        return self::$cache ??= json_decode(
            (string) file_get_contents(database_path('data/ph-places.json')),
            true,
        )['provinces'] ?? [];
    }

    /** Every province the form may submit: the built-in list plus any already in the database. */
    public static function provinceNames(): array
    {
        return array_values(array_unique([
            ...array_column(self::all(), 'name'),
            ...Province::pluck('name')->all(),
        ]));
    }

    public static function clean(string $place): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', strip_tags($place)));
    }

    /** The existing city id for this province + place, or null (never creates). */
    public static function find(string $province, string $place): ?int
    {
        $prov = Province::whereRaw('lower(name) = ?', [mb_strtolower(trim($province))])->first();

        if (! $prov) {
            return null;
        }

        return City::where('province_id', $prov->id)
            ->whereRaw('lower(name) = ?', [mb_strtolower(self::clean($place))])
            ->value('id');
    }

    /** The city id for this province + place, creating the province and/or city when new. */
    public static function cityId(string $province, string $place): int
    {
        $province = trim($province);
        $place = self::clean($place);

        $prov = Province::whereRaw('lower(name) = ?', [mb_strtolower($province)])->first()
            ?? Province::create(['name' => $province]);

        $city = City::where('province_id', $prov->id)
            ->whereRaw('lower(name) = ?', [mb_strtolower($place)])
            ->first()
            ?? City::create(['province_id' => $prov->id, 'name' => $place]);

        return $city->id;
    }
}
