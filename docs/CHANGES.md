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
