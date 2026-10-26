<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Driver edits one of THEIR rides. Same shape as publishing, except the departure may stay as it is
 * (an unchanged time is allowed; UpdateRide checks "must be in the future" only when it changes).
 * Ownership and "what is locked once passengers have booked" are enforced in UpdateRide.
 */
class UpdateRideRequest extends StoreRideRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'departure_at' => ['required', 'date'],
        ]);
    }
}
