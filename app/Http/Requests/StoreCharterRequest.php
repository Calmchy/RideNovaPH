<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Passenger's group-booking form. Driver availability, vehicle ownership and limits are re-checked in RequestCharter. */
class StoreCharterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        foreach (['pickup_location', 'dropoff_location', 'return_location', 'description'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }
    }

    public function rules(): array
    {
        return [
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
            'pickup_location' => 'pick-up point', 'dropoff_location' => 'drop-off point',
            'pickup_at' => 'pick-up date and time', 'return_location' => 'return location',
            'return_at' => 'return date and time', 'group_size' => 'number of passengers',
        ];
    }
}
