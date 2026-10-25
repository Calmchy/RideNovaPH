<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;

class BannerController extends Controller
{
    /** POST /admin/banners : add a slideshow slide (public image, unlike IDs). */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'caption' => ['nullable', 'string', 'max:255'],
            // Internal links only (e.g. /rides?destination=3): blocks javascript: and off-site redirects.
            'link_url' => ['nullable', 'string', 'max:255', 'regex:#^/[^/\\\\].*$#'],
            'image' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
        ]);

        $file = $request->file('image');

        Banner::create([
            'created_by' => $request->user()->id,
            'title' => $data['title'],
            'caption' => $data['caption'] ?? null,
            'link_url' => $data['link_url'] ?? null,
            'image_path' => $file->storeAs('banners', Str::uuid().'.'.$file->guessExtension(), 'public'),
            'display_order' => (int) Banner::max('display_order') + 1,
        ]);

        $this->toast('Banner added.');

        return back();
    }

    /** PATCH /admin/banners/{banner} : show or hide a slide. */
    public function toggle(Banner $banner): RedirectResponse
    {
        $banner->update(['is_active' => ! $banner->is_active]);

        return back();
    }

    /** DELETE /admin/banners/{banner} */
    public function destroy(Banner $banner): RedirectResponse
    {
        if (! str_starts_with($banner->image_path, 'http')) {
            Storage::disk('public')->delete($banner->image_path);
        }
        $banner->delete();

        $this->toast('Banner removed.');

        return back();
    }
}
