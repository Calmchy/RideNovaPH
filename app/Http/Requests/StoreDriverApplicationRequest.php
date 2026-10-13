<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

/** Driver licence submission (first time or resubmission after a rejection). */
class StoreDriverApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isDriver() ?? false;
    }

    public function rules(): array
    {
        return [
            'license_number' => ['required', 'string', 'max:30', 'regex:/^[A-Za-z0-9\- ]+$/', Rule::unique('driver_profiles', 'license_number')->ignore($this->user()->id, 'user_id')],
            'license_expiry' => ['required', 'date', 'after:today'],
            // Real image check, no SVG (it can carry scripts).
            'license_image' => ['required', File::image()->types(['jpg', 'jpeg', 'png'])->max(4 * 1024)],
            'consent' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'license_expiry.after' => 'An expired licence cannot be accepted.',
            'consent.accepted' => 'You must agree to the data privacy notice to upload your licence.',
        ];
    }
}
