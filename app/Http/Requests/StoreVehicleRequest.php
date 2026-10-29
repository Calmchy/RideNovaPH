<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

/**
 * Vehicle registration (create + edit). Plate numbers are normalised to upper case.
 * The three photos, the COR and the description are only taken on CREATE; afterwards the driver
 * changes them from the banner (VehicleController@photo / @description).
 */
class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isDriver() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('plate_number'))) {
            $this->merge(['plate_number' => strtoupper(trim($this->input('plate_number')))]);
        }
    }

    public function rules(): array
    {
        $ignore = $this->route('vehicle')?->id;

        $rules = [
            'model_id' => ['required', 'integer', 'exists:vehicle_models,id'],
            'color' => ['required', 'string', 'max:30', 'regex:/^[\p{L} \-]+$/u'],
            // PH plates look like ABC 1234 / ABC-1234 / 123 ABC; keep it permissive but safe.
            'plate_number' => ['required', 'string', 'max:15', 'regex:/^[A-Z0-9 \-]{5,15}$/', Rule::unique('vehicles', 'plate_number')->ignore($ignore)],
            'seat_capacity' => ['required', 'integer', 'min:1', 'max:20'],
            'manufacture_year' => ['nullable', 'integer', 'min:1990', 'max:'.(now()->year + 1)],
        ];

        if ($ignore === null) {
            // Real image check, no SVG (it can carry scripts).
            $photo = ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)];

            $rules += [
                'photo_front' => $photo,
                'photo_back' => $photo,
                'photo_interior' => $photo,
                'description' => ['nullable', 'string', 'max:500'],
                // COR = Certificate of Registration. Stored privately (it shows the owner's name and address).
                'cor_image' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
            ];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'photo_front.required' => 'Upload a photo of the front of your vehicle.',
            'photo_back.required' => 'Upload a photo of the back of your vehicle.',
            'cor_image.required' => 'Upload a photo of the vehicle’s COR (Certificate of Registration).',
            'photo_interior.required' => 'Upload a photo of the inside of your vehicle.',
        ];
    }
}
