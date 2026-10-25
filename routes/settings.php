<?php

use App\Http\Controllers\Settings\DocumentController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');

    // Profile picture: always the logged-in user's own (nothing in the URL says whose).
    Route::post('settings/profile/photo', [ProfileController::class, 'photo'])->middleware('throttle:10,1')->name('profile.photo');
    Route::delete('settings/profile/photo', [ProfileController::class, 'removePhoto'])->name('profile.photo.remove');

    // Own private documents, streamed back to their owner (licence, Gov ID, vehicle COR).
    Route::get('settings/documents/licence/{side}', [DocumentController::class, 'licence'])
        ->where('side', 'front|back')->name('documents.licence');
    Route::get('settings/documents/id/{side}', [DocumentController::class, 'identity'])
        ->where('side', 'front|back')->name('documents.id');
    Route::get('settings/documents/cor/{vehicle}', [DocumentController::class, 'cor'])->name('documents.cor');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});

Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
