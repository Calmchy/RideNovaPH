<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Vehicle registration (create + edit). Plate numbers are normalised to upper case. */
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

        return [
            'model_id' => ['required', 'integer', 'exists:vehicle_models,id'],
            'color' => ['required', 'string', 'max:30', 'regex:/^[\p{L} \-]+$/u'],
            // PH plates look like ABC 1234 / ABC-1234 / 123 ABC; keep it permissive but safe.
            'plate_number' => ['required', 'string', 'max:15', 'regex:/^[A-Z0-9 \-]{5,15}$/', Rule::unique('vehicles', 'plate_number')->ignore($ignore)],
            'seat_capacity' => ['required', 'integer', 'min:1', 'max:20'],
            'manufacture_year' => ['nullable', 'integer', 'min:1990', 'max:'.(now()->year + 1)],
        ];
    }
}
