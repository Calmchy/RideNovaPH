<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Http\Requests\StoreBookingRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        foreach (['address', 'emergency_contact_name', 'bio'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }
    }

    /**
     * Name + email (existing rules), plus contact details for everyone and
     * driver-only settings. role_id / account_status are deliberately absent:
     * a user can never edit their own role.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $phone = ['nullable', 'regex:'.StoreBookingRequest::PH_PHONE];

        return $this->profileRules($this->user()->id) + [
            'phone_number' => $phone,
            'address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone' => $phone,
            'bio' => ['nullable', 'string', 'max:280'],
            'allows_luggage' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone_number.regex' => 'Enter a Philippine mobile number like 09171234567.',
            'emergency_contact_phone.regex' => 'Enter a Philippine mobile number like 09171234567.',
        ];
    }
}
