# RideNovaPH – Setup, Architecture & Security

## 1. Setup (MySQL)
```bash
composer install && npm ci
cp .env.example .env
# edit .env: DB_CONNECTION=mysql DB_DATABASE=ridenovaph DB_USERNAME=... DB_PASSWORD=...
#            APP_TIMEZONE=Asia/Manila  ADMIN_EMAIL=you@example.com  ADMIN_PASSWORD=strong-pass
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
npm run dev        # generates Wayfinder routes, starts Vite
php artisan serve
php artisan test
```
Demo logins (local only, password `password`): passenger@ridenovaph.test, driver@ridenovaph.test, admin@ridenovaph.test.

## 2. Palette (coolors, 5 colours)
deep `#062a35` · ocean `#007f9e` · coral `#ff6f61` · sand `#f4d19a` · foam `#aee8d8`
Tailwind utilities: `bg-deep`, `text-ocean`, `bg-coral`, `bg-sand`, `bg-foam`.

## 3. Where things live
| Concern | Location |
|---|---|
| Business rules (one class = one job) | `app/Actions/{Bookings,Payments,Rides}` |
| ReserveSeat | locks the ride row, checks seats, ID verification, duplicates; writes booking + pending payment with fee snapshot |
| TransitionBooking | enforces pending→approved→confirmed→completed / cancelled, cutoff hours, frees seats |
| SettlePayment / RefundPayment | marks paid + issues receipt `RCPT-…`; refunds with audit log |
| PublishRide / UpdateTripStatus | driver ride publishing; start / complete / cancel trip |
| Validation | `app/Http/Requests` (strip_tags, PH phone regex) |
| Authorization | middleware `admin`, `driver`, `EnsureActiveAccount`, `BookingPolicy` |
| Admin | `app/Http/Controllers/Admin/*`, pages `resources/js/pages/admin/*` |
| Settings (fee %, cutoff, max seats, require ID) | `settings` table via `App\Models\Setting` |

## 4. Security checklist
- Role/status never mass-assignable (`forceFill`); registration role whitelisted (passenger|driver).
- ID/licence images on the private disk, streamed to admins only, access audit-logged.
- Policies + `lockForUpdate` transactions prevent double booking and cross-user access.
- Rate limits on login, chatbot, booking, ride creation; CSRF on all non-GET.
- Suspended users are logged out on next request and their sessions deleted.
- CSV exports neutralise formula injection; search uses LIKE escaping; notification URLs guarded against open redirects.
- Data Privacy Act consent captured at registration; `ActivityLog` records admin decisions.

## 5. Honest status
Written in an environment without a Laravel runtime: checked with `php -l`, `tsc`, ESLint only.
Migrations, Pest tests and page rendering have NOT been executed — run `php artisan test` and fix anything reported.

## 6. Anti-scam rules (Admin > Settings > Abuse protection)
| Rule | Default | Where enforced |
|---|---|---|
| Max open bookings per passenger | 3 | `ReserveSeat::assertWithinLimits` |
| Min hours between two bookings (no overlapping trips) | 3 | same |
| Cancellations in N days before booking is paused | 3 in 30 days | same |
| Unpaid cancellation fee blocks booking | on | same |
| Cancellation fee (only after the driver approved) | 20% of fare | `TransitionBooking::feeFor` |
| Reason required for every manual cancellation | min 5 chars | `TransitionBooking` + `BookingController::transition` |

Checks run inside a DB transaction with the passenger row locked, so parallel requests cannot slip past a limit.
Blocked attempts are written to the activity log (`booking.blocked`). Admin settles a fee in Transactions (Fee paid / Waive, logged).

## 7. Live GPS tracking (driver <-> passenger)
Open a CONFIRMED booking within 2 h of departure (or after the driver starts the trip): the "Live tracking" panel appears for both people.

| Piece | File |
|---|---|
| Latest positions table (one row per ride+user, overwritten on every ping) | `live_locations` migration, `App\Models\LiveLocation` |
| Who may share / window rule / arrival detection (150 m) | `App\Actions\Tracking\RecordLocation` |
| JSON endpoints (read, ping, stop, "I've arrived") | `App\Http\Controllers\TrackingController` |
| Distance + ETA maths (server fallback) | `App\Support\Geo` |
| Map, route, polling, GPS watch, arrival alert | `resources/js/components/live-tracking.tsx` |
| Road route + ETA (OSRM demo server, no key) | `routeBetween()` in `resources/js/lib/geo.ts` |

Flow: phone GPS -> `POST /tracking/rides/{ride}/ping` (every ~4 s) -> DB -> the other phone polls `GET /bookings/{booking}/tracking` (every 5 s).
Settings keys: `tracking_window_hours` (2), `arrival_radius_m` (150).

Privacy: opt-in per device ("Share my location"); each side only receives the OTHER side's position; nothing before the
window / after the trip; "Stop sharing" and trip completion/cancellation delete the stored positions; no movement history is kept.
Production note: the OSRM demo server is for light use. For real traffic host OSRM yourself or switch `routeBetween()` to a paid routing API.
Browsers only give GPS to pages on HTTPS or localhost.
