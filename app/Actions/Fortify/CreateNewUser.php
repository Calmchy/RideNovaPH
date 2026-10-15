<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Requests\StoreBookingRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /** Letters (any language), spaces, apostrophes, hyphens and periods only. */
    private const NAME_REGEX = "/^[\\p{L}][\\p{L}\\s.'\\-]*$/u";

    /**
     * Validate and create a newly registered user.
     *
     * Self-registration may only produce a PASSENGER or a DRIVER. The admin role can
     * never be requested from the form (only whitelisted values pass validation).
     * A new driver still has to upload a licence and be approved before publishing rides.
     *
     * The form collects first name, last name and middle initial; they are stored
     * together as the single `name` column ("First M. Last") used across the app.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $input = $this->normalize($input);

        Validator::make($input, [
            'first_name' => ['required', 'string', 'max:100', 'regex:'.self::NAME_REGEX],
            'last_name' => ['required', 'string', 'max:100', 'regex:'.self::NAME_REGEX],
            'middle_initial' => ['nullable', 'string', 'size:1', 'regex:/^\p{L}$/u'],
            'email' => $this->emailRules(),
            'account_type' => ['required', Rule::in(['passenger', 'driver'])],
            'phone_number' => ['nullable', 'regex:'.StoreBookingRequest::PH_PHONE],
            'password' => $this->passwordRules(),
        ], [
            'first_name.required' => 'First name is required.',
            'first_name.regex' => 'First name may only contain letters, spaces, hyphens and apostrophes.',
            'last_name.required' => 'Last name is required.',
            'last_name.regex' => 'Last name may only contain letters, spaces, hyphens and apostrophes.',
            'middle_initial.size' => 'Middle initial must be a single letter.',
            'middle_initial.regex' => 'Middle initial must be a single letter.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Enter a valid email address.',
            'email.unique' => 'That email address is already registered.',
            'account_type.required' => 'Please choose an account type.',
            'account_type.in' => 'Please choose either Passenger or Driver.',
            'phone_number.regex' => 'Enter a Philippine mobile number like 09171234567.',
            ...$this->passwordMessages(),
        ])->validate();

        $middle = $input['middle_initial'] !== null && $input['middle_initial'] !== ''
            ? mb_strtoupper($input['middle_initial']).'. '
            : '';

        $user = new User([
            'name' => $input['first_name'].' '.$middle.$input['last_name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'phone_number' => $input['phone_number'] ?? null,
        ]);

        // role_id is not mass-assignable, so it is set explicitly here.
        $user->forceFill([
            'role_id' => $input['account_type'] === 'driver' ? Role::DRIVER : Role::PASSENGER,
        ])->save();

        return $user;
    }

    /**
     * Trim whitespace (a name made only of spaces must count as blank), drop a trailing
     * period from the middle initial ("M." -> "M"), and collapse inner spacing in names.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function normalize(array $input): array
    {
        foreach (['first_name', 'last_name', 'middle_initial', 'email', 'phone_number'] as $key) {
            $value = $input[$key] ?? null;
            $input[$key] = is_string($value) ? trim($value) : null;
        }

        foreach (['first_name', 'last_name'] as $key) {
            if ($input[$key] !== null) {
                $input[$key] = preg_replace('/\s+/u', ' ', $input[$key]);
            }
        }

        if ($input['middle_initial'] !== null) {
            $input['middle_initial'] = rtrim($input['middle_initial'], '. ');
        }

        // Empty optional fields become null so "nullable" rules skip them.
        foreach (['first_name', 'last_name', 'middle_initial', 'email', 'phone_number'] as $key) {
            if ($input[$key] === '') {
                $input[$key] = null;
            }
        }

        return $input;
    }
}
