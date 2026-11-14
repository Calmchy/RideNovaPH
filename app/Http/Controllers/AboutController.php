<?php

namespace App\Http\Controllers;

use App\Models\TeamMember;
use Inertia\Inertia;
use Inertia\Response;

class AboutController extends Controller
{
    /** GET /about : static content plus the team cards (editable by the admin). */
    public function __invoke(): Response
    {
        return Inertia::render('about', [
            'team' => TeamMember::orderBy('sort_order')->orderBy('id')->get()->map(fn (TeamMember $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'role_title' => $m->role_title,
                'description' => $m->description,
                'photo' => $m->photoUrl(),
            ]),
        ]);
    }
}
