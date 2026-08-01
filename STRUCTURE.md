# Chitwan Rent — Project Structure

A map-first rental-listing app for Chitwan district, Nepal. Renters browse flats as
pins on an interactive map; owners list flats by dropping a pin; seekers post what
they're looking for; a "Spot a To-Let" gamified layer crowdsources board photos.

**Stack:** React 18 + Vite + Tailwind + react-leaflet (client) · Express + `pg`
(raw SQL, no ORM) + JWT dummy auth (server) · PostgreSQL. Two npm workspaces
(`client`, `server`) orchestrated from the root via `concurrently`.

```
chitwan-rent/
├── client/           React SPA (Vite)
├── server/           Express API + DB scripts
└── package.json      Workspace root — `npm run dev` starts both
```

---

## Root

- **`package.json`** — declares the `client`/`server` workspaces and the top-level
  `dev`/`db:schema`/`db:seed` scripts that delegate into each workspace.

---

## `client/` — the React SPA

```
client/
├── src/
│   ├── main.jsx           Entry point: React Query + Auth + Router providers
│   ├── App.jsx             <Routes>: /deleteflat is a real route, /* falls through to <MapShell />
│   ├── index.css           Tailwind entry + global styles
│   ├── components/         Everything on screen
│   │   └── ui/              Small shared form/UI primitives
│   ├── pages/               Standalone routes that aren't part of MapShell's single-page flow
│   ├── hooks/               One file per API resource (react-query wrappers)
│   ├── lib/                 Framework-free utilities (formatting, map config, geo math...)
│   └── context/             AuthContext (dummy email/phone sign-in)
├── vite.config.js
└── package.json
```

The app is effectively **one page** (`MapShell`) plus one standalone route
(`/deleteflat`) — react-router-dom otherwise only gives a few flows inside
`MapShell` their own URL (`/list-my-flat`, `/find-a-flat`, `/how-to-use`,
`/superheroes`) so they're deep-linkable and back-button-able, not for real
multi-page navigation. `/deleteflat` (`pages/DeleteFlatPage.jsx`) is different:
a real `<Route>` in `App.jsx`, reached from the delete-code email, entirely
outside `MapShell` — see "Email verification & flat deletion" below.

**Not a client route:** `/unsubscribe` (the link in weekly digest emails) is a
**server-rendered** standalone HTML page from `server/src/routes/unsubscribe.js`
— same pattern as `/verify-listing` — the browser never loads the SPA for it.
There is no `client/` file for it.

### `components/MapShell.jsx` — the orchestrator

The single largest file in the app. Owns almost all page-level state: which
modal/flow is open, filter state, the two pin-drop flows (List My Flat / Find a
Flat), Spot-a-To-Let's local state, Area Stats' draw/adjust/results steps, Locate
Me, and the search bar's selected location. Renders the `<MapContainer>`, every
map layer, the floating top bar (search + nav pills), the right-side icon stack,
and every modal in the app. Most other components are either a layer it mounts
inside the map or a modal it conditionally renders — start here to understand how
any feature fits together.

### Map chrome (rendered around/over the map)

| File | Purpose |
|---|---|
| `MapZoomGuard.jsx` | Computes and enforces a `minZoom` so the map can never zoom out past "whole Chitwan district visible" (viewport-dependent, not hardcoded). |
| `SearchBar.jsx` | Search input + suggestions dropdown. Matches locally first (places gazetteer + flat `area` values, exact→prefix→substring ranked) and only falls back to a Nominatim geocoding call, hard-bounded to the Chitwan bbox, when there's no local hit. |
| `TopNavPill.jsx` | The pill row: How to use / Avlb Flats / List My Flat / Find a Flat / Superheroes. |
| `IconStack.jsx` | Right-edge floating icon column: Spot a To-Let, Bus Routes, Schools, Satellite, More. |
| `StatusBanner.jsx` | Collapsed top-bar banner shared by the Avlb-Flats/List-My-Flat/Find-a-Flat "in progress" states. |
| `PinDropBanner.jsx` | Full-width top banner shown while Spot-a-To-Let or Area-Stats is waiting for a map tap. |
| `ListingChip.jsx` | Small bottom-left preview chip shown after tapping a flat/seeker marker, before opening the full detail panel. |

### Map layers (children of `<MapContainer>`)

| File | Purpose |
|---|---|
| `FlatsLayer.jsx` | Flat listing markers — clustered (`react-leaflet-cluster`), rendered as compact "3BHK · 22K · ★4.0" chips that shrink further at higher zoom (`FLAT_CHIP_ZOOM_SCALE`). |
| `SeekersLayer.jsx` | Seeker-pin markers, clustered. *Currently unmounted* — the map-visibility toggle for this layer was removed from the UI, but the component, the underlying data fetch, and the "Drop a Seeker Pin" submission flow are all still fully intact for when it's re-enabled. |
| `ToletSpotsLayer.jsx` | To-let board photo pins (simple popup with photo + spotter name/message). |
| `BusRoutesLayer.jsx` | Renders each bus route as a colored polyline with a name tooltip. |
| `PoisLayer.jsx` | Schools/colleges. Schools are exempt from the zoom-tier system (always visible) and use a *proportional* "halfway" label-reveal rule (`getHalfwayLabelZoom`); colleges follow the same flat tier system as every other POI category. |
| `GeneralPoisLayer.jsx` | Restaurants, cafes, hospitals/clinics, pharmacies, temples, landmarks — zoom-tier gated (see `poiTiers.js`), spatially decluttered so dense areas don't overlap, icon+label always render together (no separate label delay). |
| `AreaRectangleLayer.jsx` | The draggable-corner rectangle used by the Area Stats draw/adjust flow. |
| `PinDropCatcher.jsx` / `EmptyTapCatcher.jsx` | Invisible Leaflet click listeners — the former fires only while a flow is actively waiting for a pin placement; the latter fires only for taps that miss every marker/interactive layer (used to open the "Add something here" quick-action chooser). |

> **No `RentReportsLayer.jsx` currently exists.** `rent_reports` (the anonymous
> "what rent are you paying" data, submitted via `RentReportForm.jsx` /
> `useCreateRentReport.js`) has a working `GET /api/rent-reports` endpoint and
> 401 rows in the dev DB, but **nothing on the client fetches or renders it** —
> no read hook, no map layer, not mounted in `MapShell`. A fix for this (a
> `useRentReports.js` hook + `RentReportsLayer.jsx`, wired into `MapShell`) was
> built and verified working in an earlier session but was **never committed**
> and is no longer present on disk — `git log` has no commit for it. Rebuilding
> it means starting over, not resuming.

### Forms & multi-step flows

| File | Purpose |
|---|---|
| `AddFlatForm.jsx` → `ListFlatBranchModal.jsx` → `ListFlatDetailsForm.jsx` → `ListFlatSuccessModal.jsx` | The "List My Flat" flow: core listing fields → whole-flat-vs-flatmate branch → availability/parking/contact details → success + share. `ListFlatDetailsForm` collects email/phone and is where the account is actually created (see auth-gating note below); for `flatmate`-type listings it also shows consent copy that email/phone get shared with compatible seekers by the digest job. `ListFlatSuccessModal` now leads with "Verify your listing and your pin will be visible to everyone" + a spam-folder hint, reflecting the email-verification gate (see "Email verification & flat deletion" below) — the listing is **not** live yet when this modal shows. |
| `DropSeekerPinForm.jsx` | "Find a Flat" — the seeker's preferences + contact form; same digest-consent copy as `ListFlatDetailsForm` when `lookingFor === "room"`. |
| `SpotToLetModal.jsx` | To-let board photo capture/upload + location (GPS or pick-on-map) + spotter name/message. |
| `RentReportForm.jsx` | Anonymous "what rent are you paying" data point from the empty-map quick-action menu. Write-only in practice right now — see the `RentReportsLayer` note above; submitted data has no read-side display. |
| `InterestForm.jsx` | Generic "I'm interested" contact-capture form (name + phone-or-email + note), used from `FlatDetailPanel`. |
| `AuthGateModal.jsx` | Dummy sign-in gate — email and/or phone, no password/OTP; blocks any action that needs an identity. |
| `OnboardingModal.jsx` | Reusable "here's how it works" step list, dismissible-per-flow via `localStorage` (`isOnboardingDismissed`). |
| `QuickActionModal.jsx` | The chooser shown after an empty-map tap: rent report / list my flat / find a flat / spot a to-let. |
| `OutOfBoundsModal.jsx` | Shown when any pin drop lands more than 100km from Chitwan's center. |

`hooks/usePinDropFlow.js` is the shared state machine (`onboarding → pin-drop →
form`) driving both List My Flat and Find a Flat — see below.

**Auth-gating is deferred to point-of-action.** Identity (email + phone) is no
longer collected upfront before pin-drop — browsing into either flow requires
no sign-in at all (`usePinDropFlow`'s state machine dropped the old `auth` step
entirely). Each flow's own final form collects email/phone itself and logs the
user in inline at submit time (`MapShell`'s `handleSubmitListFlatDetails` /
`handleSubmitSeekerForm`), via the same `login()` from `AuthContext` that
`AuthGateModal` uses for actions not tied to a pin-drop flow (e.g. Spot a
To-Let, gated via `withAuth` in `MapShell`).

### Detail panels & remaining modals

| File | Purpose |
|---|---|
| `FlatDetailPanel.jsx` | Full flat detail slide-over: photo carousel, stats, "I'm interested" CTA, community rating, comments, share/report. The largest modal-ish component after `MapShell`. |
| `SeekerDetailCard.jsx` | Seeker profile modal — preferences plus an "I'm interested" CTA (routes through `InterestForm`, gated by auth). |
| `PhotoCarousel.jsx` | Swipeable photo viewer with dot indicators, used inside `FlatDetailPanel`. |
| `CommentsSection.jsx` | Comment list + composer for a flat. |
| `StarRating.jsx` | `StarRatingDisplay` (read-only) and `StarRatingInput` (interactive) widgets. |
| `FilterModal.jsx` | Full filter panel: available-only, BHK, rent range, neighbourhood, furnishing, gated, posted-within, to-let boards, near-bus-route. |
| `MoreModal.jsx` | "More tools": Locate me, Hide pins, Area stats. |
| `AreaStatsResultsModal.jsx` | Avg/min/max rent by BHK bucket for the drawn rectangle, via `useAreaStats`. |
| `SuperheroesModal.jsx` | To-let-spotter leaderboard (ranked by `hero_points`). |
| `StubModal.jsx` | Generic "coming soon" placeholder shell for not-yet-built features. |

### Primitives (`components/*.jsx` + `components/ui/`)

- **`Modal.jsx`** — the base centered-card modal shell (dimmed/blurred backdrop,
  close button) nearly every modal above is built on.
- **`SlidePanel.jsx`** — centered card on desktop / bottom sheet on mobile;
  used specifically by `FlatDetailPanel`.
- **`Switch.jsx`** — toggle switch used throughout `FilterModal`.
- **`ui/TextField.jsx`** — the shared labeled-input wrapper every form uses;
  supports `helper` text and an `error` state (red border + message).
- **`ui/Pill.jsx`**, **`ui/ToggleButton.jsx`**, **`ui/SectionLabel.jsx`** — small
  shared building blocks for option pickers and form section headers.

### `hooks/` — one file per API resource

Thin `@tanstack/react-query` wrappers, no business logic beyond building the
query string. Reads: `useFlats`, `useAreas`, `usePlaces`, `usePois`,
`useToletSpots`, `useBusRoutes`, `useSeekerPins`, `useSuperheroes`,
`useFlatComments`, `useNearbyStats`, `useNearbySeekers`, `useAreaStats`. Writes:
`useCreateFlat`, `useCreateSeekerPin`, `useCreateToletSpot`,
`useCreateRentReport`, `useAddFlatPhotos`, `useRemoveFlatPhoto`, `useRateFlat`,
`useFlatInterest`, `useCreateFlatComment`.

There is **no `useRentReports` read hook** — `useCreateRentReport` is write-only
(see the `RentReportsLayer` note above). There is also no delete-flat hook:
`DeleteFlatPage.jsx` calls `postJson` from `lib/api.js` directly rather than
going through a `useMutation` wrapper, since it's a one-off standalone page, not
a `MapShell`-embedded flow.

The one exception is **`usePinDropFlow.js`** — not a data hook but the shared
`onboarding → pin-drop → form` state machine both List My Flat and Find a Flat
are built on (keyed to a route path, so only one instance is ever active; auth
is handled separately at submit time — see the auth-gating note above).

### `lib/` — framework-free utilities

| File | Purpose |
|---|---|
| `api.js` | `fetchJson`/`postJson`/`patchJson` — attach the stored JWT as a Bearer header automatically. |
| `mapConfig.js` | Map center/default zoom, tile URLs (dark base + labels overlay, satellite), Chitwan bounding box, Nominatim viewbox string. |
| `mapIcons.jsx` | Every Leaflet `divIcon` factory in the app (POI pins, flat info chips, cluster badges, the user-location dot, drag handles, "Your Pin" marker...) — one place all marker HTML/CSS lives. |
| `poiTiers.js` | The shared zoom-tier reveal system (`POI_TIER_1_ZOOM`…`POI_TIER_5_ZOOM`, `CATEGORY_TIER`, `poiTierForZoom`) plus `getHalfwayLabelZoom`, a reusable helper for categories (currently just schools) whose label should reveal proportionally rather than at a fixed offset. |
| `geo.js` | `haversineMeters` + `findNearest` (nearest area-centroid lookup). |
| `geocode.js` | `reverseGeocodeArea` — Nominatim reverse geocode with a 5s timeout, falling back to the nearest known area centroid so pin-drop flows never block on the network. |
| `filters.js` | `DEFAULT_FILTERS`, `buildFlatsQueryParams`, `countActiveFilters`. |
| `format.js` | `formatRs`, `formatRsCompact`, `bhkLabel`, `formatRelativeTime`. |
| `validation.js` | `isValidEmail` (format + typo-detection against common providers via Levenshtein distance), `isValidPhone`/`sanitizePhoneInput` (10-digit numbers). |
| `authStorage.js` | Reads/writes the session (JWT + user) to `localStorage`. |

### `context/AuthContext.jsx`

Dummy auth provider — `login({ email, phone, name })` posts to `/api/auth/login`
(finds-or-creates a user, no password/OTP) and persists the returned session via
`authStorage.js`. Exposes `user`, `isAuthenticated`, `login`, `logout`.

---

## `server/` — Express API + database scripts

```
server/
├── src/
│   ├── index.js        Express app: middleware + route mounting, starts both background jobs
│   ├── db.js            pg Pool + query() helper
│   ├── lib/              Shared server-side logic — see table below
│   └── routes/           One file per resource
└── db/                  Schema, migrations, and data-seeding scripts (run manually, not on boot)
```

### `src/routes/` — one file per resource

| Route | Covers |
|---|---|
| `flats.js` | List/filter/get/create flats, photo attach, comments, ratings, "I'm interested" submissions, and `POST /:id/delete` (see "Email verification & flat deletion" below). A new listing is created with `status = 'pending_verification'` and only ever reaches `'available'` via the emailed verification link — there is **no** auto-flip timer anymore (an earlier `pending_review` → `available` delay has been fully replaced by the verification flow). `GET /` unconditionally excludes `pending_verification` rows and anything with `report_count >= 3`; when `?status=available` it *also* excludes `is_seed = true` rows. |
| `seekerPins.js` | List/get/create seeker pins. Creation sets `unsubscribe_token` and `next_digest_at` (`now() + 12h`) — seeker pins have no verification step, so creation is the moment a pin becomes "active" for matching purposes. |
| `toletSpots.js` | List/create to-let board spots; creating one increments the spotter's `hero_points` and flips their role to `superhero`. |
| `areas.js` | The curated ward/tole list (`areasData.js`) merged with live per-area flat counts — always returns every seeded area, even with zero current listings. Powers the `Neighbourhood` filter dropdown. |
| `places.js` | The full OSM-sourced places gazetteer (villages/towns/suburbs/neighbourhoods/hamlets) — powers the search bar's local typeahead alongside flat `area` values. Deliberately separate from `areas.js`. |
| `pois.js` | Schools/colleges/restaurants/hospitals/temples/landmarks/pharmacies, optionally filtered by `?category=`. |
| `busRoutes.js` | Static bus route polylines. |
| `stats.js` | `/nearby` (median rent by BHK within a radius), `/nearby-seekers` (seeker count within a radius), `/area` (avg/min/max rent by BHK within a bbox). |
| `superheroes.js` | To-let-spotter leaderboard. |
| `auth.js` | `/login` — dummy email/phone identity, issues a JWT. |
| `rentReports.js` | `GET`/`POST /api/rent-reports` — anonymous rent data points (no auth). Fully standalone: no `owner_id`/`user_id`/`status` column, never joined against by verification, the rate-limit, or the digest job. Has a `rent_reports.is_dummy` column in the live dev DB (200 dummy rows + 201 real, as of this writing) for telling a dev seed run's rows apart from real submissions — **but see the dev-scripts note in `db/` below: the migration and seed script that created it were never committed**, so this column is DB-only drift, not a reproducible part of the schema right now. No client code currently reads this endpoint at all (see the `RentReportsLayer` note above). |
| `verifyListing.js` | `GET /verify-listing?token=` — mounted at the bare path (not `/api`), since it's the literal link clicked from the verification email, not a JSON endpoint. Renders a small standalone HTML success/failure page. See "Email verification & flat deletion" below. |
| `unsubscribe.js` | `GET /unsubscribe?token=` — same "bare path, server-rendered HTML page" shape as `verifyListing.js`, for the link in weekly digest emails. See "Weekly match digest" below. |

`requireAuth` (from `src/lib/auth.js`) gates every write endpoint that needs to
attribute a submission to a user; read endpoints, `rentReports` (anonymous by
design), `verifyListing`, `unsubscribe`, and `flats.js`'s `POST /:id/delete`
(the 10-digit code itself is the credential) don't require it.

### `src/lib/` — shared server-side logic

| File | Purpose |
|---|---|
| `auth.js` | `requireAuth` middleware — verifies the JWT, attaches `req.userId`. |
| `geo.js` | `haversineDistanceMeters` + `isNearAnyRoute` (bus-route proximity). |
| `email.js` | Every outbound email in the app, via Nodemailer/Gmail (`EMAIL_USER`/`EMAIL_PASS`). One HTML template shell per email type, all built with the same purple-header card style: `sendVerificationEmail`, `sendDeleteCodeEmail`, `sendFlatMatchDigest`, `sendSeekerMatchDigest`. Has the app's one `escapeHtml` helper — needed because these templates are the only place free-text user data (`users.name`, contact fields) gets interpolated into HTML. |
| `verification.js` | `generateVerificationToken` / `generateUnsubscribeToken` (both 256-bit, URL-safe, plain-text — compared directly on lookup, not hashed, since they're link parameters rather than user-typed credentials) and `verifyListingByToken` — the one atomic `UPDATE ... RETURNING` that flips a flat from `pending_verification` to `available` and, in the same statement, sets `email_verified_at`, generates `delete_code_hash` and `unsubscribe_token`, and sets `next_digest_at = now() + 12h`. |
| `deleteCode.js` | `generateDeleteCode` (10-digit, CSPRNG), `hashDeleteCode` (sha256, no salt — code is already high-entropy and machine-generated), `deleteCodeHashMatches` (timing-safe compare). |
| `listingRateLimit.js` | `checkListingRateLimit` / `recordListingAttempt` — one flat listing per email per 24h, tracked in `listing_attempts` regardless of whether the resulting listing ever gets verified. |
| `deleteAttemptLimit.js` | `checkDeleteAttemptLimit` / `recordFailedDeleteAttempt` — brute-force throttle on `POST /:id/delete`'s code check (5 failed attempts / 15 min, scoped to the flat ID), backed by `flat_delete_attempts`. |
| `cleanupExpiredListings.js` | Hourly job (`startExpiredListingsCleanup`): hard-deletes `flats` rows still `pending_verification` 24h after creation (owner never clicked the link). |
| `digestJob.js` | The weekly match-digest job — see below. |

### Email verification & flat deletion

Every real (non-seed) flat listing goes through: **create** (`POST /api/flats`,
`status = 'pending_verification'`, rate-limited via `listingRateLimit.js`,
`sendVerificationEmail`) → **verify** (owner clicks the emailed link →
`GET /verify-listing?token=` → `verifyListingByToken` → `status = 'available'`,
`delete_code_hash` + `unsubscribe_token` + `next_digest_at` all set in the same
atomic update → `sendDeleteCodeEmail` fires with the plaintext 10-digit code,
which is never stored or logged) → optionally **delete**
(`pages/DeleteFlatPage.jsx` at `/deleteflat` → `POST /api/flats/:id/delete`
`{ code }`, no auth, brute-force-limited by `deleteAttemptLimit.js`, only
allowed 24h after verification, hard `DELETE FROM flats` — dependent rows
across `flat_ratings`/`flat_comments`/`flat_reports`/`flat_interests`/`matches`
all cascade via `ON DELETE CASCADE`). An unverified listing that never gets
clicked is swept up by `cleanupExpiredListings.js` instead.

### Weekly match digest

`digestJob.js` (started from `index.js` as `startDigestJob`) runs **hourly**,
but each individual flat/seeker pin is only actually processed once its own
`next_digest_at` is due — set to `now() + 12h` at verification (flats) or
creation (seeker pins), then pushed to `now() + 7 days` every time that row is
processed, sent or not. A due row's matches are computed against the *entire*
active pool on the other side (not just other due rows), so a flat due today
still sees a seeker pin that became active yesterday.

Compatibility (`isCompatible` in `digestJob.js`): same user never matches their
own listing/pin (`flat.owner_id === seeker.user_id` excluded outright), within
2km (`haversineDistanceMeters`), BHK and budget-covers-rent, and — only when
`flats.listing_type = 'flatmate'` pairs with `seeker_pins.looking_for = 'room'`
— gender/food/smoker preference compatibility (`null`/`"any"` = wildcard on
either side). A due row with zero current matches is **not** emailed (no
"we found nobody" spam) but its `next_digest_at` still advances 7 days
regardless. Each digest is capped at the top 50 matches by distance.

The `matches` table (originally built for an earlier one-time "email on first
match" version of this feature) is kept but **repurposed** as an
analytics-only "last seen compatible" log (`matched_at` upserted on every
compatible pair found) — nothing reads it to gate a send anymore.

`unsubscribe.js`'s `GET /unsubscribe?token=` hard-deletes the matching `flats`
or `seeker_pins` row by its (long-lived, plain-text) `unsubscribe_token`. It
never touches `listing_attempts`, so it cannot reset or bypass the 24h listing
rate-limit.

### `db/` — schema, migrations, and seed data

- **`schema.sql`** — the full destructive schema (drops and recreates every
  table). Only ever run against a throwaway dev DB via `run-schema.js`. **Stale
  relative to the migrations below** — e.g. it has `flats.is_seed` but not
  `verification_token`/`verification_token_expires_at`/`email_verified_at`/
  `delete_code_hash`/`unsubscribe_token`/`next_digest_at` on `flats`, not
  `is_seed`/`unsubscribe_token`/`next_digest_at` on `seeker_pins`, and doesn't
  define `listing_attempts`, `flat_delete_attempts`, or `matches` at all. A
  from-scratch DB needs `db:schema` **followed by every `add:*` migration
  below**, run in roughly chronological order, to reach the current shape —
  `schema.sql` alone will not.
- **`seed.js`** — the main dummy-data generator: users, flats, seeker pins,
  to-let spots, rent reports, scattered across the areas in `areasData.js`
  weighted by density. Marks its own rows `is_seed = true` on both `flats` and
  `seeker_pins`, so they're excluded from the digest job and from `?status=
  available` on `GET /api/flats`.
- **`areasData.js`** — the canonical ward/tole list (`name`, `lat`, `lng`,
  `weight`), the single source of truth shared by `seed.js` and the `/api/areas`
  route.
- **`poisData.js`** — shared Overpass API client (`queryOverpass`, with
  retry/backoff) plus the fuzzy-match dedup pass (`dedupePois`) and fetchers for
  schools/colleges and general POIs. Exports `CHITWAN_BBOX`, reused by
  `placesData.js`.
- **`placesData.js`** — fetches every real village/town/suburb/neighbourhood/
  hamlet OSM has tagged in the Chitwan bbox; prefers OSM's `name:en` tag over
  the primary (often Devanagari-script) `name` tag so Romanized search terms
  still match.
- **`busRoutesData.js`** — static bus route definitions + a road-snapping
  helper for realistic polylines.
- **Seed scripts** (`seed-pois.js`, `seed-general-pois.js`, `seed-places.js`,
  `seed-bus-routes.js`) — one-off, idempotent "replace this table's contents
  with fresh real data" scripts, run manually via `npm run seed:*`. All are
  dev-only in intent, but only these four currently exist as committed,
  runnable scripts — see the callout below for one that doesn't.
- **Additive migrations** (`add-flat-social-tables.js`, `add-rent-reports-table.js`,
  `add-poi-tier-column.js`, `add-flat-listing-details.js`, `add-places-table.js`,
  `add-flats-society-name.js`, `add-flats-is-seed.js`, `add-flat-reports-table.js`,
  `add-flat-verification.js`, `add-listing-attempts-table.js`,
  `add-flat-ratings-dimensions.js`, `add-flat-delete-code.js`,
  `add-delete-attempts-table.js`, `add-flats-description.js`,
  `add-flatmate-matching.js`, `add-digest-unsubscribe.js`, `add-next-digest-at.js`)
  — `CREATE TABLE/COLUMN IF NOT EXISTS`, safe to run against a dev DB that
  already has data. This is the pattern used for every schema change instead of
  re-running `schema.sql`; each has an `npm run add:*` script in
  `server/package.json`. `add-flatmate-matching.js` created the `matches` table
  (see "Weekly match digest" above) and backfilled `seeker_pins.is_seed`;
  `add-digest-unsubscribe.js` added `unsubscribe_token` to both `flats` and
  `seeker_pins`; `add-next-digest-at.js` added `next_digest_at` to both.
- **Cleanup scripts** (`remove-bank-pois.js`, `remove-noisy-shop-pois.js`,
  `remove-hotel-pois.js`, `remove-blue-pois.js`) — one-off deletions of POI
  categories that were later decided against.

> **Uncommitted DB drift: `rent_reports.is_dummy`.** An earlier session built
> `add-rent-reports-is-dummy.js` (migration) and `seed-dummy-rent-reports.js`
> (a `--confirm`-gated script generating ~200 dummy rows within
> `CHITWAN_BOUNDS`, run via a `seed:dummy-rent-reports` npm script) and ran
> them against the live dev DB — the `is_dummy` column and 200 dummy rows are
> still there right now. But **neither file was ever committed**, both are
> gone from `server/db/` today, and `server/package.json` has no
> `add:rent-reports-is-dummy` or `seed:dummy-rent-reports` script. Treat this
> exactly like the `RentReportsLayer` situation above: the DB reflects work
> that doesn't exist in the repo, and reproducing it means rebuilding the
> scripts from scratch, not re-running something that's still there.

---

## Key patterns worth knowing before making changes

- **Non-destructive by default.** Any schema change ships as a new `add-*.js`
  migration, not an edit to `schema.sql` + re-seed. `schema.sql` only matters
  for a from-scratch dev DB.
- **Zoom-tier POI system** (`lib/poiTiers.js`, mirrored nowhere else) — a
  category's tier decides *when it renders at all*; `getHalfwayLabelZoom`
  separately decides *when its name label joins the icon*, currently used only
  by schools.
- **One state machine, two flows.** `usePinDropFlow` is intentionally generic
  (route path + onboarding key in, step/draftPin out) so List My Flat and Find
  a Flat share identical onboarding/pin-drop behavior without duplicating it.
  Auth is *not* part of this state machine — see the auth-gating note above.
- **Local-first search.** `SearchBar` always checks `places` + flat `area`
  values before ever calling Nominatim, and the Nominatim call itself is
  hard-bounded (`bounded=1`) to the Chitwan bbox.
- **Marker HTML lives in one file.** Every Leaflet icon is built by
  `lib/mapIcons.jsx` via `renderToStaticMarkup` + `L.divIcon` — there is no
  per-layer inline marker markup.
- **Dummy auth.** No password/OTP anywhere — `requireAuth` only proves a
  request carries a token this server issued, good enough to attribute
  submissions to a consistent identity. Identity collection itself is deferred
  to whatever action actually needs it (see the auth-gating note above), not
  required just to browse.
- **Two flavors of "secret token," chosen deliberately.** Long-lived tokens a
  user only ever clicks as a link (`verification_token`, `unsubscribe_token`)
  are stored **plain-text** and compared directly — they're not something a
  human ever types, so hashing them buys nothing. The delete-flat code is
  different: it's manually typed back in by a human, so only its hash
  (`delete_code_hash`, sha256) is ever persisted, and the comparison
  (`deleteCodeHashMatches`) is timing-safe and rate-limited
  (`deleteAttemptLimit.js`). Both listing creation and delete attempts share
  the same sliding-window rate-limit shape (`listingRateLimit.js` /
  `deleteAttemptLimit.js`) — a `COUNT(*) ... WHERE created_at > now() -
  interval` query against a dedicated attempts table, not an in-memory limiter.
- **Per-row schedules over global intervals.** The digest job's `setInterval`
  is just an hourly *check* — the actual cadence (12h after go-live, then
  every 7 days) lives per-row in each flat/seeker pin's own `next_digest_at`
  column. Compare `cleanupExpiredListings.js`, which has no per-row schedule
  at all and instead re-evaluates every `pending_verification` row's fixed
  24h window on every hourly pass.
