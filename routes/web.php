<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\BannerController;
use App\Http\Controllers\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Admin\ContentController;
use App\Http\Controllers\Admin\DriverController as AdminDriverController;
use App\Http\Controllers\Admin\IdentityReviewController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RideController as AdminRideController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Driver\DashboardController as DriverDashboardController;
use App\Http\Controllers\Driver\RideController as DriverRideController;
use App\Http\Controllers\Driver\VehicleController;
use App\Http\Controllers\DriverApplicationController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\IdentityDocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\RideController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CharterController;

/*
|--------------------------------------------------------------------------
| Web routes
|--------------------------------------------------------------------------
| Three layers of protection, outermost first:
|   1. middleware  : auth / verified / admin / driver  (who may enter the area)
|   2. policies    : BookingPolicy (who may touch THIS booking)
|   3. actions    : ReserveSeat / TransitionBooking / ... (is the move legal right now)
| Every state-changing route is POST/PATCH/PUT/DELETE, so Laravel's CSRF check covers it.
*/

// ---- Public ----
Route::get('/', HomeController::class)->name('home');
Route::get('/rides', [RideController::class, 'index'])->name('rides.index');   // redirects into Bookings > Find
Route::get('/rides/{ride}', [RideController::class, 'show'])->name('rides.show');

// Nova, the help bot. Open to guests (rate limited so it can't be used to hammer the DB).
Route::post('/chatbot', ChatbotController::class)->middleware('throttle:20,1')->name('chatbot');

// ---- Signed-in users ----
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::inertia('/about', 'about')->name('about');

    // Valid-ID upload (rate limited: uploads are expensive and a brute-force target).
    Route::get('/identity', [IdentityDocumentController::class, 'create'])->name('identity.create');
    Route::post('/identity', [IdentityDocumentController::class, 'store'])->middleware('throttle:5,1')->name('identity.store');
    Route::post('/identity/photos', [IdentityDocumentController::class, 'photos'])
        ->middleware('throttle:10,1')->name('identity.photos');

    // Bookings hub: find a ride + my reservations + (drivers) incoming requests
    Route::get('/charters', [CharterController::class, 'index'])->name('charters.index');
Route::get('/charters/new', [CharterController::class, 'create'])->name('charters.create');
Route::post('/charters', [CharterController::class, 'store'])->middleware('throttle:10,1')->name('charters.store');
Route::get('/charters/{charter}', [CharterController::class, 'show'])->name('charters.show');
Route::patch('/charters/{charter}/quote', [CharterController::class, 'quote'])->middleware('throttle:20,1')->name('charters.quote');
Route::patch('/charters/{charter}/{action}', [CharterController::class, 'transition'])->where('action', 'accept|decline|cancel|complete')->middleware('throttle:30,1')->name('charters.transition');
Route::get('/charters/{charter}/messages', [CharterController::class, 'messages'])->name('charters.messages');
Route::post('/charters/{charter}/messages', [CharterController::class, 'send'])->middleware('throttle:30,1')->name('charters.send');

Route::patch('/availability', [CharterController::class, 'availability'])->name('availability');
    

    Route::get('/bookings', [BookingController::class, 'index'])->name('bookings.index');
    Route::get('/rides/{ride}/book', [BookingController::class, 'create'])->name('bookings.create');
    Route::post('/rides/{ride}/book', [BookingController::class, 'store'])->middleware('throttle:10,1')->name('bookings.store');
    Route::get('/bookings/{booking}', [BookingController::class, 'show'])->name('bookings.show');
    Route::patch('/bookings/{booking}/paid', [BookingController::class, 'collect'])->middleware('throttle:30,1')->name('bookings.paid');
    Route::patch('/bookings/{booking}/{action}', [BookingController::class, 'transition'])
        ->where('action', 'approve|confirm|complete|cancel')->middleware('throttle:30,1')->name('bookings.transition');
    Route::get('/bookings/{booking}/receipt', [TransactionController::class, 'receipt'])->name('bookings.receipt');
    Route::post('/bookings/{booking}/reviews', [ReviewController::class, 'store'])->middleware('throttle:10,1')->name('reviews.store');

    // Live GPS tracking between a driver and the passengers of one ride (JSON, polled every few seconds).
    Route::get('/bookings/{booking}/tracking', [TrackingController::class, 'show'])->middleware('throttle:90,1')->name('tracking.show');
    Route::post('/tracking/rides/{ride}/ping', [TrackingController::class, 'ping'])->middleware('throttle:90,1')->name('tracking.ping');
    Route::delete('/tracking/rides/{ride}/ping', [TrackingController::class, 'stop'])->name('tracking.stop');
    Route::post('/bookings/{booking}/arrived', [TrackingController::class, 'arrived'])->middleware('throttle:30,1')->name('tracking.arrived');

    // Payments / receipts
    Route::get('/transactions', [TransactionController::class, 'index'])->name('transactions.index');

    // Notifications (the bell)
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/{id}', [NotificationController::class, 'open'])->whereUuid('id')->name('notifications.open');
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

    // Old static mock page: send people to the real search instead.
    Route::redirect('/booking', '/bookings');
});

// ---- Drivers (role checked server-side by the 'driver' middleware) ----
Route::middleware(['auth', 'verified', 'driver'])->prefix('driver')->name('driver.')->group(function () {
    Route::get('/', DriverDashboardController::class)->name('index');

    Route::get('/apply', [DriverApplicationController::class, 'create'])->name('apply');
    Route::post('/apply', [DriverApplicationController::class, 'store'])->middleware('throttle:5,1')->name('apply.store');
    Route::post('/license/photos', [DriverApplicationController::class, 'replacePhotos'])
        ->middleware('throttle:10,1')->name('license.photos');
          
    Route::get('/vehicles', [VehicleController::class, 'index'])->name('vehicles.index');
    Route::post('/vehicles', [VehicleController::class, 'store'])->middleware('throttle:20,1')->name('vehicles.store');
    Route::patch('/vehicles/{vehicle}', [VehicleController::class, 'update'])->name('vehicles.update');
    Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy'])->name('vehicles.destroy');
    Route::post('/vehicles/{vehicle}/cor', [VehicleController::class, 'cor'])->middleware('throttle:20,1')->name('vehicles.cor');
    Route::post('/vehicles/{vehicle}/photos/{slot}', [VehicleController::class, 'photo'])
        ->where('slot', 'front|back|interior')->middleware('throttle:20,1')->name('vehicles.photo');
    Route::patch('/vehicles/{vehicle}/description', [VehicleController::class, 'description'])->name('vehicles.description');

    Route::get('/rides', [DriverRideController::class, 'index'])->name('rides.index');
    Route::get('/rides/create', [DriverRideController::class, 'create'])->name('rides.create');
    Route::post('/rides', [DriverRideController::class, 'store'])->middleware('throttle:20,1')->name('rides.store');
    Route::get('/rides/{ride}', [DriverRideController::class, 'show'])->name('rides.show');
    Route::patch('/rides/{ride}/start', [DriverRideController::class, 'start'])->name('rides.start');
    Route::patch('/rides/{ride}/complete', [DriverRideController::class, 'complete'])->name('rides.complete');
    Route::patch('/rides/{ride}/cancel', [DriverRideController::class, 'cancel'])->name('rides.cancel');
});

// ---- Admin only (role checked server-side by the 'admin' middleware) ----
Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin');

    Route::get('/users', [AdminUserController::class, 'index'])->name('admin.users');
    Route::get('/users/{user}', [AdminUserController::class, 'show'])->name('admin.users.show');
    Route::patch('/users/{user}', [AdminUserController::class, 'update'])->name('admin.users.update');

    Route::get('/drivers', [AdminDriverController::class, 'index'])->name('admin.drivers');
    Route::get('/drivers/{driver}/license/{side?}', [AdminDriverController::class, 'license'])
        ->where('side', 'front|back')->name('admin.drivers.license');
    Route::get('/vehicles/{vehicle}/cor', [AdminDriverController::class, 'cor'])->name('admin.vehicles.cor');
    Route::patch('/drivers/{driver}', [AdminDriverController::class, 'decide'])->name('admin.drivers.decide');

    Route::get('/identity', [IdentityReviewController::class, 'index'])->name('admin.identity');
    Route::get('/identity-documents/{document}/{side}', [IdentityReviewController::class, 'image'])->name('admin.identity.image');
    Route::patch('/identity-documents/{document}', [IdentityReviewController::class, 'decide'])->name('admin.identity.decide');

    Route::get('/rides', [AdminRideController::class, 'index'])->name('admin.rides');
    Route::patch('/rides/{ride}/cancel', [AdminRideController::class, 'cancel'])->name('admin.rides.cancel');

    Route::get('/bookings', [AdminBookingController::class, 'index'])->name('admin.bookings');
    Route::patch('/bookings/{booking}/cancel', [AdminBookingController::class, 'cancel'])->name('admin.bookings.cancel');

    Route::get('/transactions', [AdminTransactionController::class, 'index'])->name('admin.transactions');
    Route::get('/transactions/export', [AdminTransactionController::class, 'export'])->name('admin.transactions.export');
    Route::post('/transactions/{payment}/refund', [AdminTransactionController::class, 'refund'])->name('admin.transactions.refund');
    Route::post('/transactions/{payment}/fee', [AdminTransactionController::class, 'settleFee'])->name('admin.transactions.fee');

    Route::get('/reports', [ReportController::class, 'index'])->name('admin.reports');
    Route::get('/reports/export/{type}', [ReportController::class, 'export'])->where('type', 'bookings|users')->name('admin.reports.export');

    Route::get('/settings', [SettingController::class, 'edit'])->name('admin.settings');
    Route::put('/settings', [SettingController::class, 'update'])->name('admin.settings.update');

    Route::get('/content', [ContentController::class, 'index'])->name('admin.content');
    Route::post('/banners', [BannerController::class, 'store'])->name('admin.banners.store');
    Route::post('/banners/{banner}', [BannerController::class, 'update'])->name('admin.banners.update');
    Route::patch('/banners/{banner}', [BannerController::class, 'toggle'])->name('admin.banners.toggle');
    Route::delete('/banners/{banner}', [BannerController::class, 'destroy'])->name('admin.banners.destroy');
    Route::post('/announcements', [ContentController::class, 'storeAnnouncement'])->name('admin.announcements.store');
    Route::put('/announcements/{announcement}', [ContentController::class, 'updateAnnouncement'])->name('admin.announcements.update');
    Route::patch('/announcements/{announcement}', [ContentController::class, 'toggleAnnouncement'])->name('admin.announcements.toggle');
    Route::delete('/announcements/{announcement}', [ContentController::class, 'destroyAnnouncement'])->name('admin.announcements.destroy');
});

require __DIR__.'/settings.php';