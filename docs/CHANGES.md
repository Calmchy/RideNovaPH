# RideNovaPH: what changed and why

## Security findings in the original upload (act on these first)
1. `public/Backup-codes-*.txt` held 2FA recovery codes inside the web root. Anyone could download it. **Removed here, but it is in your git history: regenerate that account's 2FA codes and purge the file from history.**
2. `public/Claude Setup.exe` (7 MB installer) was inside the web root. Removed.
3. `/admin` was reachable by ANY verified user (it was a plain `Route::inertia`). Now behind the `admin` middleware (`EnsureAdmin`), checked on the server on every request.
4. `public/tests/`, empty file `c`, and stray file `laravel` removed.

## Backend added (uses your existing schema, models and `ReserveSeat`)
- `TransitionBooking` action: pending -> approved -> confirmed -> completed, cancel from any open state. Row-locked.
- `BookingPolicy`: passenger / driver / admin rules, plus review eligibility.
- Controllers: Home, Ride, Booking, Review, IdentityDocument, Dashboard, Admin (+ identity review, banners).
- Private ID storage on the `local` disk, streamed to admins only, with an audit log line per view.
- Form Requests with image validation (jpg/png, 4 MB, no SVG) and Data Privacy Act consent.
- Rate limits on uploads, booking and review endpoints.

## Frontend
- Luxury navy + gold theme. Photo backgrounds removed from landing, login/register, dashboard, booking and admin.
- Banner slideshow (admin-managed, default Philippine destination slides until photos are uploaded).
- Real pages replace the mock ones: ride search/detail, my bookings (reference number, timeline, actions, reviews), ID upload, admin (bookings, ID queue, banners).

## Not built yet (next rounds)
Post-a-ride form for drivers, driver license/vehicle upload + admin approval, announcements CRUD, chatbot UI/endpoint, notifications.

## Vehicle photo banner (driver Vehicles page + public ride page)
- Registering a vehicle now requires three photos: front, back and interior (JPG/PNG/WEBP, max 5 MB), plus an optional description (500 chars).
- Each vehicle card shows a banner (Front / Back / Interior) with a description panel below it.
- Only the owning driver gets the "Replace photo" and "Edit" controls; the server re-checks ownership on every change (403 otherwise).
- Passengers see the same banner read-only on the ride details page.
- Existing vehicles keep working; their banner shows "No photo yet" and a prompt until the driver uploads the three views.
- Run `php artisan migrate` and make sure `php artisan storage:link` has been run (photos live on the public disk, like banners).

## Driver documents + profile picture
- Driver licence now needs a FRONT and a BACK photo (private disk). Drivers who submitted before this update can add the missing back from Profile > My documents (it only fills an empty slot; it never replaces a reviewed photo).
- Every vehicle needs a COR (Certificate of Registration) photo: required when registering, and replaceable from the vehicle card. Private disk; only the owning driver and admins can open it.
- Profile > "My documents" shows the user's own licence (front/back), vehicle COR(s) and Gov ID (front/back) with their review status. Files are streamed by `Settings\DocumentController`, always looked up from the logged-in user, so changing a URL or id cannot open someone else's file.
- Profile > "Profile picture": each user uploads/changes/removes their own picture (public disk, shown in the app header). Nothing in the URL says whose picture it is, so it cannot be edited for another account.
- Admin > Drivers: links for licence front, licence back and each vehicle's COR (views are audit-logged).
- Run `php artisan migrate` (adds `driver_profiles.license_back_image_path` and `vehicles.cor_image_path`).

## Replace photos + verification badges
- Licence (front/back) and Gov ID (front/back) photos can be replaced from Profile > My documents. Pending stays pending; APPROVED goes back to pending (admins are notified, the user is warned first). Rejected documents are fixed through "Resubmit". COR, vehicle photos and the profile picture were already replaceable.
- Verification badges (Gov ID, Driver's licence) sit beside the profile picture: Verified / Pending review / Rejected / Not submitted.

## One "Replace photos" button + preview (supersedes the per-photo replace buttons above)
- Licence and Gov ID each have ONE "Replace photos" button. It opens a popup where the user picks a new front and/or back, sees a preview, and presses Save. Both go up in a single request (`POST /driver/license/photos`, `POST /identity/photos`).
- The separate "Verification" panel was removed from Profile; the badges beside the picture show the same statuses, and "Submit / Resubmit" links appear in My documents when needed.
- Clicking any document picture opens a preview popup (with an X) on the same page, never a new tab.
