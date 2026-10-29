# RideNovaPH

**Carpooling Platform for Affordable Shared Rides in the Philippines**

RideNovaPH is a Laravel web app that connects drivers with empty seats to passengers heading the same way. It is built for trips Filipinos make all the time: vacations, and travel to exam centers for LPT, CSE, TESDA, and similar. The goal is cheaper, safer, more organized travel than guessing at terminals or booking a whole vehicle alone.

> Course project for **System Integration & Architecture**, Abuyog Community College, Department of Information Technology Education.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Objectives](#objectives)
3. [Key Features](#key-features)
4. [User Roles](#user-roles)
5. [How a Booking Works](#how-a-booking-works)
6. [Tech Stack](#tech-stack)
7. [Database Overview](#database-overview)
8. [Security and Privacy](#security-and-privacy)
9. [Getting Started](#getting-started)
10. [Project Structure](#project-structure)
11. [Documentation](#documentation)
12. [Risks and Mitigation](#risks-and-mitigation)
13. [Roadmap](#roadmap)
14. [Team](#team)

---

## Problem Statement

- Exam takers often travel far to testing centers and have to pay high fares or rely on unreliable transport.
- Travelers going the same direction can't easily find each other to split costs.
- Informal ride-sharing (Facebook groups, group chats) has no verification, no records, and no accountability.

## Objectives

- Give passengers an affordable way to find and reserve seats.
- Verify drivers and passengers through ID checks.
- Make every booking traceable with a unique reference number.
- Promote local travel and keep users updated on exam schedules.
- Build trust through ratings and reviews.

## Key Features

| Feature | Description |
| --- | --- |
| **Ride Posting and Search** | Drivers post routes, date, time, seats, and price per seat. Passengers filter by origin, destination, and date. |
| **Reservation to Booking** | A passenger reserves a seat, the driver approves, and the booking becomes Confirmed. Flow: Pending → Approved → Confirmed → Completed or Cancelled. |
| **ID Required for Booking** | Passengers must upload a valid ID before their first booking. An admin verifies it. |
| **Driver ID Upload** | Drivers submit a valid ID photo, driver's license, and vehicle details for admin approval. |
| **Reference Number** | Each booking gets a unique code (e.g. `RNP-20261003-0001`) for tracking, proof of booking, and dispute handling. |
| **Reviews and Ratings** | After a completed trip, both sides rate 1–5 stars and leave a comment. Average ratings show on profiles. |
| **Banner Slideshow** | Homepage carousel of Philippine vacation spots, managed by the admin from the dashboard. |
| **Events Announcement Board** | Admin posts exam schedules and reminders (LPT, CSE, TESDA, etc.). Each post can link to rides heading to that exam city. |
| **Chatbot** | FAQ bot for how to book, ID requirements, payments, and cancellations. Rule-based for now, with room for AI later. |

### Added beyond the original proposal

These came up during development and are already in the codebase:

| Feature | Description |
| --- | --- |
| **Live GPS tracking** | On a Confirmed booking, the driver and passenger can see each other's position, distance, and ETA. Tracking opens 2 hours before departure (or when the driver starts the trip) and the stored location is deleted when the trip ends. |
| **Cancellation fees and anti-scam rules** | Configurable limits on open bookings, overlapping trips, and repeated cancellations, plus a cancellation fee once a driver has approved a booking. |
| **Payment records** | Cash-on-ride payments are recorded per booking, with receipts and refunds logged. |
| **Group charter** | A passenger can request a whole vehicle, get a quote from a driver, and message them. |
| **Driver directory and public profiles** | Browse available drivers and view their profile and reviews. |
| **Notifications and activity log** | In-app notifications for users, and an audit log of admin decisions. |

> **Payment:** version 1 is **cash-on-ride** to keep the scope realistic. Online payments are on the roadmap.

## User Roles

| Role | What they can do |
| --- | --- |
| **Passenger** | Search rides, reserve seats, upload ID, track bookings, leave reviews. |
| **Driver** | Post rides, manage booking requests, register vehicles, upload ID and license. |
| **Admin** | Verify IDs and licenses, manage the slideshow and announcements, monitor bookings, handle reports, and adjust system settings. |

## How a Booking Works

```
Passenger uploads ID  →  Admin approves ID
Driver (approved) posts a ride
Passenger reserves seats  →  booking is Pending, reference number issued
Driver approves  →  Approved  →  Confirmed
Trip happens  →  Completed
Both sides leave a review
```

A booking can be **Cancelled** at any point. Example: Maria uploads her PhilSys ID and it is approved. Kuya Ben, an approved driver with a Hiace, posts a ride from Abuyog to Tacloban for the LPT: 10 seats at ₱250. Maria reserves 2 seats, Ben approves, and after the trip both leave reviews.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | PHP 8.3+, Laravel 13, Laravel Fortify (authentication, two-factor) |
| Frontend | React 19, TypeScript, Inertia.js 3, Tailwind CSS 4, Vite |
| Maps | Leaflet |
| Database | MySQL (recommended); SQLite works for quick local runs |
| Quality tools | Pest/PHPUnit, Pint, PHPStan, ESLint, Prettier |

**Palette:** deep `#062a35` · ocean `#007f9e` · coral `#ff6f61` · sand `#f4d19a` · foam `#aee8d8`

## Database Overview

The database tells one story: who you are, who is verified, what rides exist, who booked, and how it went. See the [Database Guide](#documentation) for the full flow and sample queries.

| Group | Tables |
| --- | --- |
| Users and verification | `roles`, `users`, `id_types`, `identity_documents` |
| Drivers and vehicles | `driver_profiles`, `vehicles`, `vehicle_makes`, `vehicle_models` |
| Locations | `provinces`, `cities` |
| Rides and bookings | `rides`, `bookings`, `reviews`, `payments`, `live_locations` |
| Charter | `charter_requests`, `charter_messages` |
| Content | `banners`, `announcement_categories`, `announcements`, `chatbot_intents`, `chatbot_keywords` |
| System | `settings`, `activity_logs`, `notifications` |

Design decisions worth knowing:

- **No `is_verified` column.** An approved row in `identity_documents` is the single source of truth, so it can never go out of sync.
- **A ride stores the vehicle, not the driver.** The vehicle knows its driver, so a ride can't point to a car owned by one driver while claiming another posted it.
- **Seats left is calculated**, not stored: seats offered minus seats in non-cancelled bookings.
- **`fare_per_seat` is copied onto each booking**, so later price changes don't alter old bookings.
- **`(ride_id, passenger_id)` is unique**, which stops double booking.
- **Reviews don't store who reviewed whom.** The booking and `reviewer_role` already tell you.

## Security and Privacy

- ID and license images are kept on a **private disk** and are viewable by admins only; access is audit-logged.
- **Role-based access** through Laravel policies, gates, and middleware.
- **CSRF protection**, input validation, and **rate limiting** on login, chatbot, booking, and ride creation.
- Image uploads are validated for type and size.
- Booking runs inside database transactions with row locking, so parallel requests can't double-book or slip past limits.
- **Data Privacy Act of 2012 (RA 10173):** a consent checkbox at registration and data retention rules.
- Suspended users are signed out on their next request.

## Getting Started

### Requirements

- PHP 8.3 or higher with Composer
- Node.js and npm
- MySQL (or SQLite for a quick trial)

### Installation

```bash
git clone https://github.com/Calmchy/RideNovaPH.git
cd RideNovaPH

composer install
npm ci

cp .env.example .env
php artisan key:generate
```

Edit `.env`:

```env
APP_TIMEZONE=Asia/Manila

DB_CONNECTION=mysql
DB_DATABASE=ridenovaph
DB_USERNAME=your_user
DB_PASSWORD=your_password

ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-password
```

Then set up the database and storage:

```bash
php artisan migrate:fresh --seed
php artisan storage:link
```

### Run the app

```bash
npm run dev          # in one terminal: Vite + generated routes
php artisan serve    # in another terminal
```

Open <http://localhost:8000>.

### Demo accounts (local only)

The demo seeder creates these accounts, all with the password `password`:

| Role | Email |
| --- | --- |
| Passenger | `passenger@ridenovaph.test` |
| Driver | `driver@ridenovaph.test` |
| Admin | `admin@ridenovaph.test` |

> Never run the demo seeder in production.

### Useful commands

```bash
php artisan test           # run the test suite
composer lint              # fix PHP style (Pint)
npm run lint               # fix JS/TS lint issues
npm run types:check        # TypeScript check
```

## Project Structure

| Concern | Location |
| --- | --- |
| Business rules (one class, one job) | `app/Actions/{Bookings,Payments,Rides,Tracking}` |
| Controllers | `app/Http/Controllers` (`Admin/`, `Driver/`, `Settings/`) |
| Validation | `app/Http/Requests` |
| Authorization | middleware (`admin`, `driver`, `EnsureActiveAccount`) and `BookingPolicy` |
| Models | `app/Models` |
| Migrations and seeders | `database/migrations`, `database/seeders` |
| Pages and components | `resources/js/pages`, `resources/js/components` |
| Routes | `routes/web.php` |
| Admin-configurable settings | `settings` table via `App\Models\Setting` |

## Documentation

| Document | Purpose |
| --- | --- |
| Project Proposal | Overview, objectives, features, roles, risks, and roadmap |
| Database Guide | Database flow, logic, and the query process |
| [`docs/SETUP_AND_SECURITY.md`](docs/SETUP_AND_SECURITY.md) | Setup, architecture, security checklist, anti-scam rules, live tracking |
| [`docs/CHANGES.md`](docs/CHANGES.md) | Change log |

## Risks and Mitigation

| Risk | Mitigation |
| --- | --- |
| Fake IDs | Manual admin review, with an LTO license check for drivers |
| Low early adoption | Start with one route, such as Leyte to Tacloban exam centers |
| Privacy concerns | Private storage, consent, limited access |
| Driver no-shows | Reviews, cancellation policy, reference number records |

## Roadmap

- GCash / Maya online payments
- SOS button
- Mobile app (Flutter)
- AI-powered chatbot
- Expanding beyond the first pilot route

## Team

| Name | Role |
| --- | --- |
| **Geonard Pagaduan** | Project Leader |
| **John Paul Lelis** | Member |
| **Chyril Manatad** | Member |