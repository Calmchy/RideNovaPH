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

    /**
     * Validate and create a newly registered user.
     *
     * Self-registration may only produce a PASSENGER or a DRIVER. The admin role can
     * never be requested from the form (only whitelisted values pass validation).
     * A new driver still has to upload a licence and be approved before publishing rides.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'account_type' => ['nullable', Rule::in(['passenger', 'driver'])],
            'phone_number' => ['nullable', 'regex:'.StoreBookingRequest::PH_PHONE],
            'password' => $this->passwordRules(),
        ], [
            'phone_number.regex' => 'Enter a Philippine mobile number like 09171234567.',
        ])->validate();

        $user = new User([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'phone_number' => $input['phone_number'] ?? null,
        ]);

        // role_id is not mass-assignable, so it is set explicitly here.
        $user->forceFill([
            'role_id' => ($input['account_type'] ?? 'passenger') === 'driver' ? Role::DRIVER : Role::PASSENGER,
        ])->save();

        return $user;
    }
}
