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
