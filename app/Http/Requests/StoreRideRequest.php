<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Driver publishes a ride. Ownership of the vehicle is re-checked in PublishRide. */
class StoreRideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isApprovedDriver() ?? false;
    }

    protected function prepareForValidation(): void
    {
        foreach (['pickup_point', 'dropoff_point', 'notes'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'origin_city_id' => ['required', 'integer', 'exists:cities,id'],
            'destination_city_id' => ['required', 'integer', 'exists:cities,id', 'different:origin_city_id'],
            'pickup_point' => ['required', 'string', 'max:150'],
            'dropoff_point' => ['nullable', 'string', 'max:150'],
            'departure_at' => ['required', 'date', 'after:now'],
            'seats_offered' => ['required', 'integer', 'min:1', 'max:20'],
            'price_per_seat' => ['required', 'numeric', 'min:0', 'max:50000'],
            'notes' => ['nullable', 'string', 'max:255'],
            'announcement_id' => ['nullable', 'integer', 'exists:announcements,id'],
        ];
    }
}
