<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Vehicle registration (create + edit). Plate numbers are normalised to upper case.
 * Only the basic details are asked here. The photos, the COR and the description are added from the
 * vehicle's own card afterwards (VehicleController@photo / @cor / @description).
 */
class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isDriver() ?? false;
    }

    protected function prepareForValidation(): void
    {
        foreach (['custom_make', 'custom_model'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(preg_replace('/\s+/u', ' ', strip_tags($this->input($field))))]);
            }
        }

        if (is_string($this->input('plate_number'))) {
            $this->merge(['plate_number' => strtoupper(trim($this->input('plate_number')))]);
        }
    }

    public function rules(): array
    {
        $ignore = $this->route('vehicle')?->id;

        $rules = [
            // Pick a listed model, or choose "other" and type your own make and model.
            'model_id' => ['required', Rule::when($this->input('model_id') !== 'other', ['integer', 'exists:vehicle_models,id'])],
            'custom_make' => ['exclude_unless:model_id,other', 'required', 'string', 'min:2', 'max:50', "regex:/^[\p{L}\p{N} .\-']+$/u"],
            'custom_model' => ['exclude_unless:model_id,other', 'required', 'string', 'min:1', 'max:50', "regex:/^[\p{L}\p{N} .\-']+$/u"],
            'color' => ['required', 'string', 'max:30', 'regex:/^[\p{L} \-]+$/u'],
            // PH plates look like ABC 1234 / ABC-1234 / 123 ABC; keep it permissive but safe.
            'plate_number' => ['required', 'string', 'max:15', 'regex:/^[A-Z0-9 \-]{5,15}$/', Rule::unique('vehicles', 'plate_number')->ignore($ignore)],
            'seat_capacity' => ['required', 'integer', 'min:1', 'max:20'],
            'manufacture_year' => ['nullable', 'integer', 'min:1990', 'max:'.(now()->year + 1)],
        ];

        return $rules;
    }

    public function messages(): array
    {
        return [
            'custom_make.required' => 'Type the make (brand), e.g. Honda.',
            'custom_model.required' => 'Type the model, e.g. Civic.',
            'custom_make.regex' => 'Use letters and numbers only.',
            'custom_model.regex' => 'Use letters and numbers only.',
        ];
    }
}
