<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Renter's form. Vehicle availability, price and overlaps are re-checked in RequestRental (the DB is the judge). */
class StoreRentalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        foreach (['renter_name', 'renter_phone', 'renter_address', 'license_number', 'pickup_location', 'return_location', 'purpose'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            // The info the owner asks for before handing over the keys.
            'renter_name' => ['required', 'string', 'max:120'],
            'renter_phone' => ['required', 'string', 'regex:/^[0-9+\-\s()]{7,30}$/'],
            'renter_address' => ['required', 'string', 'max:255'],
            'license_number' => ['required', 'string', 'max:40'],
            'license_expiry' => ['required', 'date', 'after:today'],
            // When and where.
            'start_at' => ['required', 'date', 'after:now'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'pickup_location' => ['required', 'string', 'max:255'],
            'return_location' => ['required', 'string', 'max:255'],
            'purpose' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function attributes(): array
    {
        return [
            'renter_name' => 'full name', 'renter_phone' => 'contact number', 'renter_address' => 'home address',
            'license_number' => 'driver’s licence number', 'license_expiry' => 'licence expiry date',
            'start_at' => 'start date and time', 'end_at' => 'return date and time',
            'pickup_location' => 'pick-up place', 'return_location' => 'return place',
        ];
    }

    public function messages(): array
    {
        return ['renter_phone.regex' => 'Enter a valid contact number.'];
    }
}
