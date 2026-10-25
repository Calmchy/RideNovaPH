<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreIdentityDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        // Real image check (reads the file, not just the extension). SVG is excluded
        // on purpose: it can carry scripts.
        $image = fn () => File::image()->types(['jpg', 'jpeg', 'png'])->max(4 * 1024);

        return [
            'id_type_id' => ['required', 'integer', 'exists:id_types,id'],
            'front_image' => ['required', $image()],
            'back_image' => ['nullable', $image()],
            // Data Privacy Act of 2012: explicit consent before we store an ID.
            'consent' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        return ['consent.accepted' => 'You must agree to the data privacy notice to upload an ID.'];
    }
}
