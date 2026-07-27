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
│   ├── App.jsx             Just renders <MapShell />
│   ├── index.css           Tailwind entry + global styles
│   ├── components/         Everything on screen
│   │   └── ui/              Small shared form/UI primitives
│   ├── hooks/               One file per API resource (react-query wrappers)
│   ├── lib/                 Framework-free utilities (formatting, map config, geo math...)
│   └── context/             AuthContext (dummy email/phone sign-in)
├── vite.config.js
└── package.json
```

The whole app is effectively **one page** (`MapShell`) — react-router-dom is used
only to give a few flows their own URL (`/list-my-flat`, `/find-a-flat`,
`/how-to-use`, `/superheroes`) so they're deep-linkable and back-button-able, not
for real multi-page navigation.

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

### Forms & multi-step flows

| File | Purpose |
|---|---|
| `AddFlatForm.jsx` → `ListFlatBranchModal.jsx` → `ListFlatDetailsForm.jsx` → `ListFlatSuccessModal.jsx` | The "List My Flat" flow: core listing fields → whole-flat-vs-flatmate branch → availability/parking/contact details → success + share. |
| `DropSeekerPinForm.jsx` | "Find a Flat" — the seeker's preferences + contact form. |
| `SpotToLetModal.jsx` | To-let board photo capture/upload + location (GPS or pick-on-map) + spotter name/message. |
| `RentReportForm.jsx` | Anonymous "what rent are you paying" data point from the empty-map quick-action menu. |
| `InterestForm.jsx` | Generic "I'm interested" contact-capture form (name + phone-or-email + note), used from `FlatDetailPanel`. |
| `AuthGateModal.jsx` | Dummy sign-in gate — email and/or phone, no password/OTP; blocks any action that needs an identity. |
| `OnboardingModal.jsx` | Reusable "here's how it works" step list, dismissible-per-flow via `localStorage` (`isOnboardingDismissed`). |
| `QuickActionModal.jsx` | The chooser shown after an empty-map tap: rent report / list my flat / find a flat / spot a to-let. |
| `OutOfBoundsModal.jsx` | Shown when any pin drop lands more than 100km from Chitwan's center. |

`hooks/usePinDropFlow.js` is the shared state machine (`auth → onboarding →
pin-drop → form`) driving both List My Flat and Find a Flat — see below.

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
`useCreateRentReport`, `useAddFlatPhotos`, `useRateFlat`, `useFlatInterest`,
`useCreateFlatComment`.

The one exception is **`usePinDropFlow.js`** — not a data hook but the shared
`auth → onboarding → pin-drop → form` state machine both List My Flat and Find a
Flat are built on (keyed to a route path, so only one instance is ever active).

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
│   ├── index.js        Express app: middleware + route mounting
│   ├── db.js            pg Pool + query() helper
│   ├── lib/              auth.js (JWT), geo.js (haversine, route proximity)
│   └── routes/           One file per resource
└── db/                  Schema, migrations, and data-seeding scripts (run manually, not on boot)
```

### `src/routes/` — one file per resource

| Route | Covers |
|---|---|
| `flats.js` | List/filter/get/create flats, photo attach, comments, ratings, "I'm interested" submissions. New listings auto-flip `pending_review` → `available` after a short delay (no real moderation step). |
| `seekerPins.js` | List/get/create seeker pins. |
| `toletSpots.js` | List/create to-let board spots; creating one increments the spotter's `hero_points` and flips their role to `superhero`. |
| `areas.js` | The curated ward/tole list (`areasData.js`) merged with live per-area flat counts — always returns every seeded area, even with zero current listings. Powers the `Neighbourhood` filter dropdown. |
| `places.js` | The full OSM-sourced places gazetteer (villages/towns/suburbs/neighbourhoods/hamlets) — powers the search bar's local typeahead alongside flat `area` values. Deliberately separate from `areas.js`. |
| `pois.js` | Schools/colleges/restaurants/hospitals/temples/landmarks/pharmacies, optionally filtered by `?category=`. |
| `busRoutes.js` | Static bus route polylines. |
| `stats.js` | `/nearby` (median rent by BHK within a radius), `/nearby-seekers` (seeker count within a radius), `/area` (avg/min/max rent by BHK within a bbox). |
| `superheroes.js` | To-let-spotter leaderboard. |
| `auth.js` | `/login` — dummy email/phone identity, issues a JWT. |
| `rentReports.js` | Anonymous rent data points (no auth). |

`requireAuth` (from `src/lib/auth.js`) gates every write endpoint that needs to
attribute a submission to a user; read endpoints and `rentReports` (anonymous by
design) don't require it.

### `db/` — schema, migrations, and seed data

- **`schema.sql`** — the full destructive schema (drops and recreates every
  table). Source of truth for table shapes; only ever run against a throwaway
  dev DB via `run-schema.js`.
- **`seed.js`** — the main dummy-data generator: users, flats, seeker pins,
  to-let spots, rent reports, scattered across the areas in `areasData.js`
  weighted by density.
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
  with fresh real data" scripts, run manually via `npm run seed:*`.
- **Additive migrations** (`add-flat-social-tables.js`, `add-rent-reports-table.js`,
  `add-poi-tier-column.js`, `add-flat-listing-details.js`, `add-places-table.js`)
  — `CREATE TABLE/COLUMN IF NOT EXISTS`, safe to run against a dev DB that
  already has data. This is the pattern used for every schema change instead of
  re-running `schema.sql`.
- **Cleanup scripts** (`remove-bank-pois.js`, `remove-noisy-shop-pois.js`,
  `remove-hotel-pois.js`, `remove-blue-pois.js`) — one-off deletions of POI
  categories that were later decided against.

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
  a Flat share identical auth/onboarding/pin-drop behavior without duplicating
  it.
- **Local-first search.** `SearchBar` always checks `places` + flat `area`
  values before ever calling Nominatim, and the Nominatim call itself is
  hard-bounded (`bounded=1`) to the Chitwan bbox.
- **Marker HTML lives in one file.** Every Leaflet icon is built by
  `lib/mapIcons.jsx` via `renderToStaticMarkup` + `L.divIcon` — there is no
  per-layer inline marker markup.
- **Dummy auth.** No password/OTP anywhere — `requireAuth` only proves a
  request carries a token this server issued, good enough to attribute
  submissions to a consistent identity.
