<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Passenger's group-booking form. Driver availability, vehicle ownership and limits are re-checked in RequestCharter. */
class StoreCharterRequest extends FormRequest
{
    /** Letters (any language), spaces, apostrophes, hyphens and periods only. */
    private const NAME_REGEX = "/^[\\p{L}][\\p{L}\\s.'\\-]*$/u";

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        foreach (['pickup_location', 'dropoff_location', 'return_location', 'description', 'passenger_last_name', 'passenger_first_name', 'passenger_middle_initial', 'passenger_name_ext', 'passenger_phone'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }

        // "M." or "m" -> one upper-case letter.
        if (is_string($this->input('passenger_middle_initial'))) {
            $this->merge(['passenger_middle_initial' => mb_strtoupper(rtrim($this->input('passenger_middle_initial'), '. '))]);
        }

        // The driver sees one full name: "First M. Last Jr."
        $parts = [
            $this->input('passenger_first_name'),
            filled($this->input('passenger_middle_initial')) ? $this->input('passenger_middle_initial').'.' : null,
            $this->input('passenger_last_name'),
            $this->input('passenger_name_ext'),
        ];
        $this->merge(['passenger_name' => trim(preg_replace('/\s+/', ' ', implode(' ', array_filter($parts, fn ($p) => is_string($p) && $p !== ''))))]);
    }

    public function rules(): array
    {
        return [
            // Who is asking: the driver needs a real name and a number to reach them.
            'passenger_last_name' => ['required', 'string', 'max:100', 'regex:'.self::NAME_REGEX],
            'passenger_first_name' => ['required', 'string', 'max:100', 'regex:'.self::NAME_REGEX],
            'passenger_middle_initial' => ['nullable', 'string', 'size:1', 'regex:/^\p{L}$/u'],
            'passenger_name_ext' => ['nullable', 'string', 'max:10', 'regex:/^[A-Za-z0-9. ]+$/'],
            'passenger_name' => ['required', 'string', 'max:255'],
            'passenger_phone' => ['required', 'string', 'regex:/^[0-9+\-\s()]{7,30}$/'],
            'driver_id' => ['required', 'integer', 'exists:users,id'],
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'group_size' => ['required', 'integer', 'min:1', 'max:60'],
            'pickup_location' => ['required', 'string', 'max:255'],
            'dropoff_location' => ['required', 'string', 'max:255'],
            'pickup_at' => ['required', 'date', 'after:now'],
            // The return trip is optional, but its place and time come together.
            'return_location' => ['nullable', 'string', 'max:255', 'required_with:return_at'],
            'return_at' => ['nullable', 'date', 'after:pickup_at', 'required_with:return_location'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'passenger_last_name' => 'last name', 'passenger_first_name' => 'first name',
            'passenger_middle_initial' => 'middle initial', 'passenger_name_ext' => 'name extension',
            'passenger_name' => 'name', 'passenger_phone' => 'contact number',
            'pickup_location' => 'pick-up point', 'dropoff_location' => 'drop-off point',
            'pickup_at' => 'pick-up date and time', 'return_location' => 'return location',
            'return_at' => 'return date and time', 'group_size' => 'number of passengers',
        ];
    }

    public function messages(): array
    {
        return [
            'passenger_middle_initial.size' => 'Middle initial must be a single letter.',
            'passenger_middle_initial.regex' => 'Middle initial must be a single letter.',
            'passenger_name_ext.regex' => 'Use letters or numbers only, e.g. Jr., Sr., III.',
            'passenger_phone.regex' => 'Enter a valid contact number.',
        ];
    }
}
