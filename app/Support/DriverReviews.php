<?php

namespace App\Support;

use App\Models\Review;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * The PUBLIC list of what passengers said about a driver (shown on the ride page and the driver profile).
 * Only passenger-written reviews of the driver are included, and the reviewer is shown as
 * "First name + last initial" so a stranger can't pull full names out of the site.
 */
class DriverReviews
{
    /** @return list<array{id:int, rating:int, comment:?string, reviewer:string, at:?string}> */
    public static function for(int $driverId, int $limit = 10): array
    {
        return self::query($driverId)
            ->with('booking.passenger:id,name')
            ->latest()->limit($limit)->get()
            ->map(fn (Review $r) => self::row($r))->all();
    }

    /** Base query: passenger reviews about this driver. */
    private static function query(int $driverId)
    {
        return Review::query()
            ->where('reviewer_role', 'passenger')
            ->whereHas('booking.ride.vehicle', fn ($v) => $v->where('driver_id', $driverId));
    }

    /**
     * Average, total and how many reviews each star level got (for the "5 stars ▇▇▇ 83%" bars).
     *
     * @return array{average: ?float, total: int, distribution: array<int, array{stars:int, count:int, percent:int}>}
     */
    public static function summary(int $driverId): array
    {
        $counts = self::query($driverId)->selectRaw('rating, COUNT(*) as n')->groupBy('rating')->pluck('n', 'rating');
        $total = (int) $counts->sum();
        $avg = $total ? round($counts->map(fn ($n, $stars) => $n * $stars)->sum() / $total, 1) : null;

        return [
            'average' => $avg,
            'total' => $total,
            'distribution' => collect([5, 4, 3, 2, 1])->map(fn ($stars) => [
                'stars' => $stars,
                'count' => (int) ($counts[$stars] ?? 0),
                'percent' => $total ? (int) round(($counts[$stars] ?? 0) / $total * 100) : 0,
            ])->all(),
        ];
    }

    /** Full review history, newest first, optionally only one star level. 10 per page. */
    public static function history(int $driverId, ?int $stars = null): LengthAwarePaginator
    {
        return self::query($driverId)
            ->when($stars !== null && $stars >= 1 && $stars <= 5, fn ($q) => $q->where('rating', $stars))
            ->with('booking.passenger:id,name')
            ->latest()->paginate(10)->withQueryString()
            ->through(fn (Review $r) => self::row($r));
    }

    /** One review as the page shows it. */
    public static function row(Review $r): array
    {
        return [
            'id' => $r->id,
            'rating' => $r->rating,
            'comment' => $r->comment,
            'reviewer' => self::shortName($r->booking->passenger->name ?? 'Passenger'),
            'at' => $r->created_at?->toIso8601String(),
        ];
    }

    /** "Juan Dela Cruz" -> "Juan C." */
    private static function shortName(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];

        return count($parts) > 1
            ? $parts[0].' '.mb_strtoupper(mb_substr(end($parts), 0, 1)).'.'
            : ($parts[0] ?: 'Passenger');
    }
}
