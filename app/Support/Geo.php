<?php

namespace App\Support;

/** Distance and travel-time maths used by live tracking (no external service needed). */
class Geo
{
    private const EARTH_KM = 6371.0088;

    /** Great-circle distance in kilometres (haversine). */
    public static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return self::EARTH_KM * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Rough minutes to cover a straight-line distance by road.
     * Roads are longer than the straight line (x1.3) and the speed is the driver's current speed when
     * they are really moving, else a 30 km/h city/provincial average. The browser shows the road-routing
     * (OSRM) figure when it has one; this is the always-available server fallback.
     */
    public static function etaMinutes(float $km, ?float $speedKmh = null): int
    {
        $speed = ($speedKmh !== null && $speedKmh >= 10) ? min($speedKmh, 80) : 30;

        return max(1, (int) ceil(($km * 1.3 / $speed) * 60));
    }
}
