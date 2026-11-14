<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/** One person on the About page's "The Team Behind RideNova PH" row. */
class TeamMember extends Model
{
    protected $fillable = ['name', 'role_title', 'description', 'photo_path', 'sort_order'];

    public function photoUrl(): ?string
    {
        return $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null;
    }
}
