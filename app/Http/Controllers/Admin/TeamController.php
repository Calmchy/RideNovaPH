<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\TeamMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;

/** Admin edits the About page team cards: name, role, description and picture. */
class TeamController extends Controller
{
    /** POST /admin/team/{member} (a POST because it carries a file upload) */
    public function update(Request $request, TeamMember $member): RedirectResponse
    {
        foreach (['name', 'role_title', 'description'] as $f) {
            if (is_string($request->input($f))) {
                $request->merge([$f => trim(strip_tags($request->input($f)))]);
            }
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'role_title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:400'],
            'photo' => ['nullable', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(3 * 1024)],
            'remove_photo' => ['nullable', 'boolean'],
        ]);

        $path = $member->photo_path;
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $new = $file->storeAs('team', Str::uuid().'.'.$file->guessExtension(), 'public');
            if ($path) {
                Storage::disk('public')->delete($path);
            }
            $path = $new;
        } elseif ($request->boolean('remove_photo') && $path) {
            Storage::disk('public')->delete($path);
            $path = null;
        }

        $member->update([
            'name' => $data['name'],
            'role_title' => $data['role_title'],
            'description' => $data['description'] ?? null,
            'photo_path' => $path,
        ]);

        ActivityLog::record($request->user(), 'team.updated', $member);
        $this->toast('Team card saved.');

        return back();
    }
}
