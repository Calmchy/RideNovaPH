<?php

namespace App\Support;

/**
 * The Terms & Conditions an owner can attach to a vehicle for rent.
 * Parties, vehicle details, dates and the price already come from the rental itself,
 * so these are the parts only the owner can decide. Everything is optional text/number.
 */
class RentalTerms
{
    public const FUEL = [
        'full_to_full' => 'Full to full (returned with a full tank)',
        'same_level' => 'Return with the same fuel level',
        'refuel_charge' => 'Refuelling charge applies',
    ];

    /** key => [label, kind, max]. Order = display order. */
    public const FIELDS = [
        'vin' => ['Vehicle VIN / chassis no.', 'string', 40],
        'late_fee_amount' => ['Late return fee', 'number', 100000],
        'late_fee_unit' => ['Late return fee is charged', 'unit', 10],
        'late_fee_description' => ['Late return fee details', 'text', 500],
        'extra_fees' => ['Other fees (delivery, cleaning, etc.)', 'text', 500],
        'deposit_amount' => ['Security deposit (₱)', 'number', 1000000],
        'deposit_terms' => ['Deposit refund / deduction conditions', 'text', 500],
        'insurance' => ['Insurance and liability (damage, theft, traffic fines)', 'text', 700],
        'fuel_policy' => ['Fuel policy', 'fuel', 30],
        'fuel_notes' => ['Fuel notes', 'string', 200],
        'allowed_area' => ['Where the vehicle may be driven', 'text', 500],
        'prohibited' => ['Prohibited uses (racing, towing, subleasing, etc.)', 'text', 500],
        'min_age' => ['Minimum renter age', 'age', 99],
        'min_experience_years' => ['Minimum driving experience (years)', 'age', 60],
        'driver_requirements' => ['Other driver requirements', 'text', 500],
        'inspection' => ['Pre- and post-rental inspection', 'text', 500],
        'free_cancel_hours' => ['Free cancellation until (hours before pick-up)', 'age', 720],
        'cancellation_terms' => ['Cancellation and no-show policy', 'text', 500],
        'other' => ['Other terms', 'text', 1000],
    ];

    /** Laravel rules for a `terms.*` payload. */
    public static function rules(string $prefix = 'terms'): array
    {
        $rules = [$prefix => ['nullable', 'array']];

        foreach (self::FIELDS as $key => [, $kind, $max]) {
            $rules["{$prefix}.{$key}"] = match ($kind) {
                'number' => ['nullable', 'numeric', 'min:0', "max:{$max}"],
                'age' => ['nullable', 'integer', 'min:0', "max:{$max}"],
                'fuel' => ['nullable', 'in:'.implode(',', array_keys(self::FUEL))],
                'unit' => ['nullable', 'in:hour,day'],
                default => ['nullable', 'string', "max:{$max}"],
            };
        }

        return $rules;
    }

    /** Trim, strip tags and drop empty values. Returns null when nothing is left. */
    public static function clean(?array $terms): ?array
    {
        $out = [];

        foreach (self::FIELDS as $key => [, $kind]) {
            $v = $terms[$key] ?? null;
            if (is_string($v)) {
                $v = trim(strip_tags($v));
            }
            if ($v === null || $v === '') {
                continue;
            }
            $out[$key] = in_array($kind, ['number', 'age'], true) ? $v + 0 : $v;
        }

        // A late fee without a unit means per hour.
        if (isset($out['late_fee_amount']) && ! isset($out['late_fee_unit'])) {
            $out['late_fee_unit'] = 'hour';
        }

        return $out ?: null;
    }

    /** Label + readable value rows for the screens (empty fields are skipped). */
    public static function present(?array $terms): array
    {
        $rows = [];

        foreach (self::FIELDS as $key => [$label, $kind]) {
            // The fee's unit is shown together with the amount, not as its own row.
            if ($kind === 'unit' || ! isset($terms[$key]) || $terms[$key] === '') {
                continue;
            }
            $v = $terms[$key];
            $v = match ($kind) {
                'number' => '₱'.number_format((float) $v, 2).($key === 'late_fee_amount' && isset($terms['late_fee_unit']) ? ' per '.$terms['late_fee_unit'] : ''),
                'fuel' => self::FUEL[$v] ?? $v,
                default => (string) $v,
            };
            $rows[] = ['key' => $key, 'label' => $label, 'value' => $v];
        }

        return $rows;
    }
}
