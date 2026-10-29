<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Lets a signed-in user see THEIR OWN private documents on the Profile page
 * (driver licence, Gov ID, vehicle COR). Files live on the private disk, so these
 * routes are the only way to read them; every lookup starts from the logged-in user,
 * so nobody can open somebody else's file by changing the URL.
 */
class DocumentController extends Controller
{
    /** GET /settings/documents/licence/{front|back} */
    public function licence(Request $request, string $side): StreamedResponse
    {
        $profile = $request->user()->driverProfile;
        abort_unless($profile, 404);

        return $this->stream($side === 'back' ? $profile->license_back_image_path : $profile->license_image_path);
    }

    /** GET /settings/documents/id/{front|back} : the user's most recent Gov ID submission. */
    public function identity(Request $request, string $side): StreamedResponse
    {
        $document = $request->user()->identityDocuments()->latest()->first();
        abort_unless($document, 404);

        return $this->stream($side === 'back' ? $document->back_image_path : $document->front_image_path);
    }

    /** GET /settings/documents/cor/{vehicle} : 404 (not 403) for other drivers' vehicles, so ids can't be probed. */
    public function cor(Request $request, Vehicle $vehicle): StreamedResponse
    {
        abort_unless($vehicle->driver_id === $request->user()->id, 404);

        return $this->stream($vehicle->cor_image_path);
    }

    private function stream(?string $path): StreamedResponse
    {
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
