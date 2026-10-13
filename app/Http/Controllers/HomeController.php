<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Banner;
use App\Models\City;
use App\Models\Ride;
use App\Support\RidePresenter;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /** GET / : landing page with the admin-managed slideshow, search box, latest rides and exam notices. */
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'banners' => Banner::slideshow()->get()->map(fn (Banner $b) => [
                'id' => $b->id,
                'title' => $b->title,
                'caption' => $b->caption,
                'link_url' => $b->link_url,
                'image_url' => str_starts_with($b->image_path, 'http')
                    ? $b->image_path
                    : Storage::disk('public')->url($b->image_path),
            ]),
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'rides' => Ride::with(RidePresenter::WITH)
                ->available()->withSeatsLeft()
                ->orderBy('departure_at')->limit(6)->get()
                ->map(fn (Ride $r) => RidePresenter::card($r)),
            'announcements' => Announcement::upcoming()->with(['category', 'city'])
                ->limit(4)->get()->map(fn (Announcement $a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'category' => $a->category->name,
                    'city' => $a->city?->name,
                    'city_id' => $a->city_id,
                    'exam_date' => $a->exam_date?->toDateString(),
                ]),
        ]);
    }
}
