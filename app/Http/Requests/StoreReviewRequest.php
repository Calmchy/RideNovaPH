<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Participant + completed + not-yet-reviewed is enforced by BookingPolicy::review.
        return $this->user()->can('review', $this->route('booking'));
    }

    /** Reviews are shown publicly, so strip any HTML before validating. */
    protected function prepareForValidation(): void
    {
        if (is_string($this->comment)) {
            $this->merge(['comment' => trim(strip_tags($this->comment)) ?: null]);
        }
    }

    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
