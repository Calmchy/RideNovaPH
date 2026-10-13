<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementCategory;
use App\Models\Banner;
use App\Models\City;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/** Admin > Content: slideshow banners (BannerController) and the announcements / exam schedule board. */
class ContentController extends Controller
{
    /** GET /admin/content */
    public function index(): Response
    {
        return Inertia::render('admin/content', [
            'banners' => Banner::orderBy('display_order')->get()->map(fn (Banner $b) => [
                'id' => $b->id, 'title' => $b->title, 'caption' => $b->caption,
                'link_url' => $b->link_url, 'is_active' => $b->is_active,
                'image_url' => str_starts_with($b->image_path, 'http') ? $b->image_path : Storage::disk('public')->url($b->image_path),
            ]),
            'announcements' => Announcement::with(['category', 'city'])->latest()->limit(30)->get()->map(fn (Announcement $a) => [
                'id' => $a->id, 'title' => $a->title, 'category' => $a->category->name, 'city' => $a->city?->name,
                'exam_date' => $a->exam_date?->toDateString(), 'is_published' => $a->is_published,
            ]),
            'categories' => AnnouncementCategory::orderBy('name')->get(['id', 'name']),
            'cities' => City::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /** POST /admin/announcements */
    public function storeAnnouncement(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category_id' => ['required', 'integer', 'exists:announcement_categories,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
            'exam_date' => ['nullable', 'date'],
        ]);

        Announcement::create([
            'title' => strip_tags($data['title']),
            'body' => strip_tags($data['body']),
        ] + $data + ['created_by' => $request->user()->id]);

        $this->toast('Announcement posted.');

        return back();
    }

    /** PATCH /admin/announcements/{announcement} : publish / unpublish */
    public function toggleAnnouncement(Announcement $announcement): RedirectResponse
    {
        $announcement->update(['is_published' => ! $announcement->is_published]);

        return back();
    }

    /** DELETE /admin/announcements/{announcement} */
    public function destroyAnnouncement(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();
        $this->toast('Announcement deleted.');

        return back();
    }
}
