<?php

namespace App\Http\Requests;

use App\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The "Review & Reserve" form. Shape rules only: whether the seats are actually
 * free (and every other business rule) is enforced again inside ReserveSeat.
 */
class StoreBookingRequest extends FormRequest
{
    /** Philippine mobile number: 09xxxxxxxxx or +639xxxxxxxxx. */
    public const PH_PHONE = '/^(\+63|0)9\d{9}$/';

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** Strip HTML from free-text fields so stored text can never carry markup. */
    protected function prepareForValidation(): void
    {
        foreach (['contact_name', 'contact_address', 'pickup_location', 'return_location'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'seats' => ['required', 'integer', 'min:1', 'max:'.Setting::int('max_seats_per_booking')],
            'contact_name' => ['required', 'string', 'max:120'],
            'contact_address' => ['required', 'string', 'max:255'],
            'contact_email' => ['required', 'email:rfc', 'max:190'],
            'contact_phone' => ['required', 'regex:'.self::PH_PHONE],
            'pickup_location' => ['required', 'string', 'max:255'],
            'pickup_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'pickup_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'pickup_at' => ['required', 'date', 'after_or_equal:now'],
            'return_location' => ['nullable', 'string', 'max:255'],
            'return_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'return_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'return_at' => ['nullable', 'date', 'after:pickup_at', 'required_with:return_location'],
            'agree' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'contact_phone.regex' => 'Enter a Philippine mobile number like 09171234567.',
            'agree.accepted' => 'Please confirm the booking terms (cash on ride, cancellation cut-off).',
        ];
    }
}
