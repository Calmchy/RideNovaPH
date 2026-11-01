<?php

namespace App\Http\Requests;

use App\Models\RentalRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

/** Renter's form. Vehicle availability, price and overlaps are re-checked in RequestRental (the DB is the judge). */
class StoreRentalRequest extends FormRequest
{
    /** Letters (any language), spaces, apostrophes, hyphens and periods only. */
    private const NAME_REGEX = "/^[\\p{L}][\\p{L}\\s.'\\-]*$/u";

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        foreach (['renter_last_name', 'renter_first_name', 'renter_middle_initial', 'renter_name_ext', 'renter_phone', 'renter_address', 'pickup_location', 'return_location', 'purpose', 'emergency_name', 'emergency_relationship', 'emergency_phone', 'emergency_address', 'destination', 'additional_drivers', 'signature_name'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(strip_tags($this->input($field)))]);
            }
        }

        // The middle initial may be typed as "M." or "m"; keep one upper-case letter.
        if (is_string($this->input('renter_middle_initial'))) {
            $this->merge(['renter_middle_initial' => mb_strtoupper(rtrim($this->input('renter_middle_initial'), '. '))]);
        }

        // The rest of the app (owner's page, signature check) uses one full name: "First M. Last Jr."
        $parts = [
            $this->input('renter_first_name'),
            filled($this->input('renter_middle_initial')) ? $this->input('renter_middle_initial').'.' : null,
            $this->input('renter_last_name'),
            $this->input('renter_name_ext'),
        ];
        $this->merge(['renter_name' => trim(preg_replace('/\s+/', ' ', implode(' ', array_filter($parts, fn ($p) => is_string($p) && $p !== ''))))]);
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            // The info the owner asks for before handing over the keys.
            'renter_last_name' => ['required', 'string', 'max:100', 'regex:'.self::NAME_REGEX],
            'renter_first_name' => ['required', 'string', 'max:100', 'regex:'.self::NAME_REGEX],
            'renter_middle_initial' => ['nullable', 'string', 'size:1', 'regex:/^\p{L}$/u'],
            'renter_name_ext' => ['nullable', 'string', 'max:10', 'regex:/^[A-Za-z0-9. ]+$/'],
            // Built from the four parts above in prepareForValidation().
            'renter_name' => ['required', 'string', 'max:255'],
            'renter_phone' => ['required', 'string', 'regex:/^[0-9+\-\s()]{7,30}$/'],
            'renter_address' => ['required', 'string', 'max:255'],
            // Photo of the licence ID (private disk; only the renter and the owner can open it). No SVG.
            'license_id' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
            // When and where.
            'start_at' => ['required', 'date', 'after:now'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'pickup_location' => ['required', 'string', 'max:255'],
            'return_location' => ['required', 'string', 'max:255'],
            'purpose' => ['nullable', 'string', 'max:500'],
            // Safety details for both sides.
            'birth_date' => ['required', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'license_type' => ['required', 'in:'.implode(',', array_keys(RentalRequest::LICENSE_TYPES))],
            'driving_years' => ['required', 'integer', 'min:0', 'max:80'],
            'passenger_count' => ['required', 'integer', 'min:1', 'max:20'],
            'emergency_name' => ['required', 'string', 'max:120'],
            'emergency_relationship' => ['required', 'string', 'max:50'],
            'emergency_address' => ['required', 'string', 'max:255'],
            'emergency_phone' => ['required', 'string', 'regex:/^[0-9+\-\s()]{7,30}$/'],
            'destination' => ['required', 'string', 'max:255'],
            'additional_drivers' => ['nullable', 'string', 'max:500'],
            // Agreement: always required. The typed name must match the renter's name (checked in RequestRental).
            'accept_terms' => ['accepted'],
            'signature_name' => ['required', 'string', 'max:120'],
        ];
    }

    public function attributes(): array
    {
        return [
            'renter_last_name' => 'last name', 'renter_first_name' => 'first name', 'renter_middle_initial' => 'middle initial', 'renter_name_ext' => 'name extension', 'renter_name' => 'full name', 'renter_phone' => 'contact number', 'renter_address' => 'home address',
            'license_id' => 'licence ID photo',
            'birth_date' => 'date of birth', 'license_type' => 'licence type', 'driving_years' => 'years of driving experience',
            'passenger_count' => 'number of people', 'emergency_name' => 'emergency contact name', 'emergency_phone' => 'emergency contact number',
            'emergency_relationship' => 'relationship', 'emergency_address' => 'emergency contact address',
            'destination' => 'where you will drive it', 'signature_name' => 'signature',
            'start_at' => 'start date and time', 'end_at' => 'return date and time',
            'pickup_location' => 'pick-up place', 'return_location' => 'return place',
        ];
    }

    public function messages(): array
    {
        return [
            'renter_middle_initial.size' => 'Middle initial must be a single letter.',
            'renter_middle_initial.regex' => 'Middle initial must be a single letter.',
            'renter_name_ext.regex' => 'Use letters or numbers only, e.g. Jr., Sr., III.',
            'renter_phone.regex' => 'Enter a valid contact number.',
            'emergency_phone.regex' => 'Enter a valid contact number.',
            'birth_date.before_or_equal' => 'You must be at least 18 years old to rent a vehicle.',
            'license_id.required' => 'Upload a photo of your driver’s licence ID.',
            'accept_terms.accepted' => 'Please read and agree to the terms and conditions.',
        ];
    }
}
