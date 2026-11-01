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
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
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
                'link_url' => $b->link_url, 'city_id' => $b->city_id, 'is_active' => $b->is_active, 'display_order' => $b->display_order,
                'image_url' => str_starts_with($b->image_path, 'http') ? $b->image_path : '/storage/'.$b->image_path,
            ]),
            'announcements' => Announcement::with(['category', 'city'])->latest()->limit(30)->get()->map(fn (Announcement $a) => [
                'id' => $a->id, 'title' => $a->title, 'body' => $a->body, 'image_url' => $a->imageUrl(), 'category' => $a->category->name, 'category_id' => $a->category_id,
                'city' => $a->city?->name, 'city_id' => $a->city_id,
                'exam_date' => $a->exam_date?->toDateString(), 'is_published' => $a->is_published,
            ]),
            'categories' => AnnouncementCategory::orderBy('name')->get(['id', 'name']),
            'cities' => City::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /** Shared validation for add + edit. The picture is optional (JPG/PNG/WebP, max 5 MB). */
    private function noteRules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:announcement_categories,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
            'exam_date' => ['nullable', 'date'],
            'image' => ['nullable', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
            'remove_image' => ['nullable', 'boolean'],
        ];
    }

    /** Save the uploaded picture on the public disk under a random name (never the user's file name). */
    private function storeImage(Request $request): ?string
    {
        $file = $request->file('image');

        return $file ? $file->storeAs('announcements', Str::uuid().'.'.$file->guessExtension(), 'public') : null;
    }

    /** POST /admin/announcements */
    public function storeAnnouncement(Request $request): RedirectResponse
    {
        $data = $request->validate($this->noteRules());

        Announcement::create([
            'category_id' => $data['category_id'],
            'city_id' => $data['city_id'] ?? null,
            'exam_date' => $data['exam_date'] ?? null,
            'title' => strip_tags($data['title']),
            'body' => strip_tags($data['body']),
            'image_path' => $this->storeImage($request),
            'created_by' => $request->user()->id,
        ]);

        $this->toast('Announcement posted.');

        return back();
    }

    /** PUT /admin/announcements/{announcement} : edit an announcement after posting. */
    public function updateAnnouncement(Request $request, Announcement $announcement): RedirectResponse
    {
        $data = $request->validate($this->noteRules());

        $fields = [
            'category_id' => $data['category_id'],
            'city_id' => $data['city_id'] ?? null,
            'exam_date' => $data['exam_date'] ?? null,
            'title' => strip_tags($data['title']),
            'body' => strip_tags($data['body']),
        ];

        // New picture replaces the old one; "remove_image" clears it. Old file is deleted only after the new one is saved.
        $old = $announcement->image_path;
        if ($new = $this->storeImage($request)) {
            $fields['image_path'] = $new;
        } elseif ($request->boolean('remove_image')) {
            $fields['image_path'] = null;
        }

        $announcement->update($fields);

        if (array_key_exists('image_path', $fields) && $old && ! str_starts_with($old, 'http')) {
            Storage::disk('public')->delete($old);
        }

        $this->toast('Announcement updated.');

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
        if ($announcement->image_path && ! str_starts_with($announcement->image_path, 'http')) {
            Storage::disk('public')->delete($announcement->image_path);
        }
        $announcement->delete();
        $this->toast('Announcement deleted.');

        return back();
    }
}
