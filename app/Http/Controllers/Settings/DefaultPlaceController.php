<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** The user's default place: saved once, then used to pre-fill "From" (finding a ride / publishing a ride). */
class DefaultPlaceController extends Controller
{
    /** POST /settings/default-place */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'province' => ['nullable', 'string', 'max:80'],
            'place' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $request->user()->forceFill([
            'default_province' => trim(strip_tags((string) ($data['province'] ?? ''))) ?: null,
            'default_place' => trim(strip_tags($data['place'])),
        ])->save();

        $this->toast('Default place saved. “From” will start with it from now on.');

        return back();
    }

    /** DELETE /settings/default-place */
    public function destroy(Request $request): RedirectResponse
    {
        $request->user()->forceFill(['default_province' => null, 'default_place' => null])->save();
        $this->toast('Default place removed.');

        return back();
    }
}
