<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a CSV download row by row (constant memory, fine for big tables).
 * Cells starting with = + - @ are prefixed with ' so Excel never runs them as
 * formulas (CSV injection), e.g. a user named "=HYPERLINK(...)".
 */
class Csv
{
    /**
     * @param  list<string>  $headers
     * @param  iterable<list<scalar|null>>  $rows
     */
    public static function download(string $filename, array $headers, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            foreach ($rows as $row) {
                fputcsv($out, array_map([self::class, 'safe'], $row));
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private static function safe(mixed $cell): mixed
    {
        return is_string($cell) && $cell !== '' && str_contains('=+-@', $cell[0]) ? "'".$cell : $cell;
    }
}
