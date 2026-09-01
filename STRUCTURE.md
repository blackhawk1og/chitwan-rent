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
  `dev`/`db:schema`/`db:migrate`/`db:seed` scripts that delegate into each
  workspace. `db:migrate` is the one-command full setup — see `db/` below.

---

## `client/` — the React SPA

```
client/
├── src/
│   ├── main.jsx           Entry point: React Query + Auth + Router providers
│   ├── App.jsx             <Routes>: /flatstatus, /about, /contact, /privacy,
│   │                       /termofuse, /internal/dashboard are real routes;
│   │                       /* falls through to <MapShell />
│   ├── index.css           Tailwind entry + global styles
│   ├── components/         Everything on screen
│   │   └── ui/              Small shared form/UI primitives
│   ├── pages/               Standalone routes that aren't part of MapShell's single-page flow
│   ├── hooks/               One file per API resource (react-query wrappers)
│   ├── lib/                 Framework-free utilities (formatting, map config, geo math...)
│   └── context/             AuthContext (dummy email/phone sign-in)
├── vite.config.js
├── vercel.json              SPA rewrite — see the Deployment section below
└── package.json
```

The app is effectively **one page** (`MapShell`) plus **six standalone routes**
— react-router-dom otherwise only gives a few flows inside `MapShell` their own
URL (`/list-my-flat`, `/find-a-flat`, `/how-to-use`, `/superheroes`) so they're
deep-linkable and back-button-able, not for real multi-page navigation. The six
real `<Route>`s in `App.jsx`, entirely outside `MapShell`:

| Route | Page | Notes |
|---|---|---|
| `/flatstatus` | `FlatStatusPage.jsx` | Replaces the old `/deleteflat` — see "Email verification & flat deletion / status" below. |
| `/about` | `AboutPage.jsx` | Full page, own nav bar. |
| `/contact` | `ContactPage.jsx` | Full page, own nav bar. |
| `/privacy` | `PrivacyPolicyPage.jsx` | Full page, own nav bar. |
| `/termofuse` | `TermsOfUsePage.jsx` | Full page, own nav bar. |
| `/internal/dashboard` | `InternalDashboardPage.jsx` | Password-gated — see "Internal dashboard" below. |

`/about`/`/contact`/`/privacy`/`/termofuse` each build their own `NavBar`/
`Footer` inline (no shared header component extracted — nothing else needed a
persistent nav bar when these were built) and use a Helvetica Light font
distinct from the rest of the app. **Two separate ways to see the privacy/terms
content on purpose:** `LandingCard.jsx`'s own inline "Privacy Policy"/"Terms of
Use" links open `LegalModal.jsx` (a modal, shown before ever reaching the map),
while the nav bar on any of the four full pages links to the standalone
`/privacy`/`/termofuse` routes — these are deliberately two different
components serving the same content in two different contexts, not a
duplicate-that-should-be-merged.

**All four have real content right now, not placeholders** — re-read each
file directly for this doc update, not assumed from commit messages alone.
`AboutPage.jsx` and `ContactPage.jsx` (real content added after initially
shipping as placeholders — see `git log`) have specific, non-generic copy:
About covers why the app exists, a 4-step "how the platform works" list, a
tech/transparency section naming the actual stack, and a credited shout-out to
`bengaluru.rent`; Contact has a real email, a real LinkedIn link, and specific
"what's not a good channel" guidance. `PrivacyPolicyPage.jsx` (192 lines) and
`TermsOfUsePage.jsx` (140 lines) are verbatim copies of `LegalModal.jsx`'s own
body text, and per that file's own header comment, every factual claim in them
was checked against this app's actual code before being written (e.g. that map
tiles come from OpenStreetMap/CARTO/Esri, not Google; that contact fields are
technically present in the public `GET /api/flats`/`GET /api/seeker-pins`
responses even though no UI renders them) — not copied from a generic
boilerplate template. The two pairs (`LegalModal.jsx` vs. the two standalone
pages) are kept manually in sync, per that same comment — there's no shared
source of truth for the text, so a future edit to one needs the same edit
applied to the other by hand.

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
any feature fits together. `<LandingCard />` is shown before the map on every
fresh visit (dismissed via its own "Let's start" button, not persisted across
visits).

### Map chrome (rendered around/over the map)

| File | Purpose |
|---|---|
| `MapZoomGuard.jsx` | Computes and enforces a `minZoom` so the map can never zoom out past "whole Chitwan district visible" (viewport-dependent, not hardcoded). |
| `SearchBar.jsx` | Search input + suggestions dropdown. Matches locally first (places gazetteer + flat `area` values, exact→prefix→substring ranked) and only falls back to a Nominatim geocoding call, hard-bounded to the Chitwan bbox, when there's no local hit. |
| `TopNavPill.jsx` | The pill row: How to use / Avlb Flats / List My Flat / Find a Flat / Superheroes. Labels hide below `sm:` (640px) — icon-only on mobile. |
| `IconStack.jsx` | Right-edge floating icon column: Spot a To-Let, Bus Routes, Schools, Satellite, More. Same label-hiding convention as `TopNavPill.jsx` below `sm:`. |
| `StatusBanner.jsx` | Collapsed top-bar banner shared by the Avlb-Flats/List-My-Flat/Find-a-Flat "in progress" states. |
| `PinDropBanner.jsx` | Full-width top banner shown while Spot-a-To-Let or Area-Stats is waiting for a map tap. |
| `ListingChip.jsx` | Small bottom-left preview chip shown after tapping a flat/seeker marker, before opening the full detail panel. |
| `InitialLoadScreen.jsx` | Non-blocking overlay card shown only for the *very first* `useFlats` fetch of the session — the one that can be sitting behind a cold Render free-tier instance (30-60s). Rotating tips (reused verbatim from `LandingCard.jsx`'s own tone), a bouncing icon, and honest "waking up the server" copy, styled with the same card look and the existing `card-glow-purple` animation as the rest of the app. Every *later* reload (e.g. a filter change) keeps the original small "Loading flats…" pill unchanged — `MapShell` tracks whether the first-ever load has completed and never shows this card again after that. |

### Map layers (children of `<MapContainer>`)

| File | Purpose |
|---|---|
| `FlatsLayer.jsx` | Flat listing markers — clustered (`react-leaflet-cluster`), rendered as compact "3BHK · 22K · ★4.0" chips that shrink further at higher zoom (`FLAT_CHIP_ZOOM_SCALE`). Cluster clicks go through `lib/clusterBehavior.js`'s `createClusterClickHandler`, not the library's own default handler — a cluster whose flats sit at (near-)identical coordinates and will never visually separate, even at max zoom, shows `NearbyFlatsModal.jsx` (a plain tap-to-select list) after one zoom-in click, instead of spiderfying overlapping chips apart. |
| `PlaceLabelsLayer.jsx` | Locality name labels (villages/towns/suburbs/neighbourhoods/hamlets, from the `places` gazetteer) — its own small zoom-tier system (`PLACE_TIER_1_ZOOM`/`PLACE_TIER_2_ZOOM`, deliberately not merged into `poiTiers.js` since places are a different dataset), plus a from-scratch spatial decluttering pass that estimates label/chip/POI-pin widths and drops any label that would overlap an already-kept one or a flat chip/POI pin. Rendered below flat chips and POI pins in z-order. |
| `SeekersLayer.jsx` | Seeker-pin markers, clustered. *Currently unmounted* — the map-visibility toggle for this layer was removed from the UI, but the component, the underlying data fetch, and the "Drop a Seeker Pin" submission flow are all still fully intact for when it's re-enabled. |
| `ToletSpotsLayer.jsx` | To-let board pins — orange "To-Let" pills with a calendar glyph and a pointed tail (`createToLetPillIcon`), clustered via `MarkerClusterGroup` exactly like `FlatsLayer` but with a single-line `"<n> TO-LET"` badge. Zoom-gated: nothing renders below `TOLET_SPOTS_MIN_ZOOM` (14, i.e. two steps past the default district view), so the opening map stays clear of them. A pin click goes straight to `ToletSpotDetailCard` — no intermediate `ListingChip` step. See "To-Let spotting" below. |
| `BusRoutesLayer.jsx` | Renders each bus route as a colored polyline with a name tooltip. |
| `PoisLayer.jsx` | Schools/colleges. Schools are exempt from the zoom-tier system (always visible) and use a *proportional* "halfway" label-reveal rule (`getHalfwayLabelZoom`); colleges follow the same flat tier system as every other POI category. |
| `GeneralPoisLayer.jsx` | Restaurants, cafes, hospitals/clinics, pharmacies, temples, landmarks — zoom-tier gated (see `poiTiers.js`), spatially decluttered so dense areas don't overlap, icon+label always render together (no separate label delay). |
| `AreaRectangleLayer.jsx` | The draggable-corner rectangle used by the Area Stats draw/adjust flow. |
| `PinDropCatcher.jsx` / `EmptyTapCatcher.jsx` | Invisible Leaflet click listeners — the former fires only while a flow is actively waiting for a pin placement; the latter fires only for taps that miss every marker/interactive layer (used to open the "Add something here" quick-action chooser). |

> **No `RentReportsLayer.jsx` currently exists — reconfirmed live, not assumed,
> as of this doc update.** `rent_reports` (the anonymous "what rent are you
> paying" data, submitted via `RentReportForm.jsx` / `useCreateRentReport.js`)
> has a working `GET /api/rent-reports` endpoint, but **nothing on the client
> fetches or renders it** — grepped `client/src/hooks` and `client/src/
> components` directly: there is no `useRentReports.js` read hook and no
> `RentReportsLayer.jsx` (or any file resembling one) anywhere on disk right
> now. A fix for this was built and verified working in an earlier session but
> was **never committed** and is not present today — `git log` has no commit
> for it. This exact situation has recurred more than once this session
> (built, then lost to a rewind) — if rebuilding it, treat it as starting over,
> not resuming, and consider committing early this time.

### Forms & multi-step flows

| File | Purpose |
|---|---|
| `AddFlatForm.jsx` → `ListFlatBranchModal.jsx` → `ListFlatDetailsForm.jsx` → `ListFlatSuccessModal.jsx` | The "List My Flat" flow: core listing fields (incl. the rent-cap check — see "Rent-cap system" below) → whole-flat-vs-flatmate branch → availability/parking/contact details → success + share. `ListFlatDetailsForm` collects email/phone and is where the account is actually created (see auth-gating note below); for `flatmate`-type listings it also shows consent copy that email/phone get shared with compatible seekers by the digest job. `ListFlatSuccessModal` leads with "Verify your listing and your pin will be visible to everyone" + a spam-folder hint, reflecting the email-verification gate (see "Email verification & flat deletion / status" below) — the listing is **not** live yet when this modal shows. Its WhatsApp share text builds the link from `window.location.origin` at share-time, not a hardcoded domain — resolves to the real production URL (`https://chitwan-rent.vercel.app`) automatically, whatever a Vercel preview URL, or `localhost` in dev, with no manual fix ever needed if the domain changes. |
| `RentCapConfirmModal.jsx` | "Double-check this pin?" — shown by `AddFlatForm` only when the soft rent-cap warning is active; see "Rent-cap system" below. |
| `DropSeekerPinForm.jsx` | "Find a Flat" — the seeker's preferences + contact form; same digest-consent copy as `ListFlatDetailsForm` when `lookingFor === "room"`. Submitting when the entered email already has other `seeker_pins` rows triggers `ArchiveCheckPinsModal.jsx` first — see "Seeker-pin archive flow" below. |
| `ArchiveCheckPinsModal.jsx` | Shown before creating a new seeker pin when the submitted email already has existing pins (active and/or archived) on file — lets the submitter archive some/all/none of their old ones. See "Seeker-pin archive flow" below. |
| `SpotToLetModal.jsx` | To-let board photo capture/upload + location (GPS or pick-on-map) + spotter name/message. Submitting is a two-step request, not one: the raw photo `File` (kept alongside the local base64 preview, which still only drives the in-modal thumbnail) uploads to Cloudinary first via `POST /api/tolet-spots/upload-photo` (`hooks/useUploadToletPhoto.js`), then the returned URL is sent as `photo_url` to `POST /api/tolet-spots` — see "To-Let spot photo storage" below. Shows a distinct "Uploading photo…" state before "Putting it on the map…", and a separate error message if the upload step itself fails. |
| `RentReportForm.jsx` | Anonymous "what rent are you paying" data point from the empty-map quick-action menu — rent, BHK, and gated/not-gated are required; furnishing and parking-spot count are optional (`rent_reports.furnishing`/`parking_for`, mirroring `flats`' own vocabulary for those two fields). Write-only in practice right now — see the `RentReportsLayer` note above; submitted data has no read-side display anywhere in the client (it does now show up in the internal dashboard — see "Internal dashboard" below — but that's an operator view, not a public one). |
| `InterestForm.jsx` | "I'm interested" contact-capture form, used from `FlatDetailPanel`. Collects **email + phone (required, no name field)**, plus three optional fields — Move-in Timeline (same Pill selector as `ListFlatDetailsForm`'s "Available from"), "You are" gender (same `ToggleButton` trio as `DropSeekerPinForm`'s own gender field), and Parking required (same boolean `ToggleButton` pair as `DropSeekerPinForm`, with a conditional "number of spots" `TextField` — same numeric pattern as `AddFlatForm`'s "Parking for" — shown only once parking is marked required). See "Interest submissions" below for what happens server-side. |
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
To-Let, gated via `withAuth` in `MapShell`). `InterestForm.jsx` follows the
same pattern — `login()` is called inline with the submitted email/phone right
before the `POST /:id/interest` request fires.

### Detail panels & remaining modals

| File | Purpose |
|---|---|
| `FlatDetailPanel.jsx` | Full flat detail slide-over: photo carousel, stats, "I'm interested" CTA, community rating, comments, share/report (opens `ReportReasonModal.jsx`). The largest modal-ish component after `MapShell`. |
| `ReportReasonModal.jsx` | "Flag this listing?" — an optional written reason (never required; `POST /:id/report` itself treats it as optional too), opened from `FlatDetailPanel`. Copy states the 3-report removal threshold directly to the reporter. |
| `SeekerDetailCard.jsx` | Seeker profile modal — preferences plus an "I'm interested" CTA (routes through `InterestForm`, gated by auth). |
| `ToletSpotDetailCard.jsx` | Click-through card for a To-Let pin: header (pin icon + "To-Let spotted" + `formatShortDate`), the board photo full-width, a "as seen on board — verify from the photo above" caption, and Share + "Board gone / wrong" buttons. Deliberately **no call button** — a phone number visible in the photo is never OCR'd or auto-dialed. Owns its own `AuthGateModal` (same self-contained pattern as `FlatDetailPanel`). See "To-Let spotting" below. |
| `NearbyFlatsModal.jsx` | Plain tap-to-select list of flats shown instead of spiderfying a cluster that will never visually separate (near-identical coordinates) — see `FlatsLayer.jsx`/`lib/clusterBehavior.js` above. |
| `PhotoCarousel.jsx` | Swipeable photo viewer with dot indicators, used inside `FlatDetailPanel`. |
| `CommentsSection.jsx` | Comment list + composer for a flat. |
| `StarRating.jsx` | `StarRatingDisplay` (read-only) and `StarRatingInput` (interactive) widgets. |
| `FilterModal.jsx` | Full filter panel: available-only, BHK, rent range, neighbourhood, furnishing, gated, posted-within, near-bus-route. (There used to be a "Show To-Let boards" toggle here; it was removed — to-let visibility is purely zoom-based now. See "To-Let spotting" below for why.) |
| `MoreModal.jsx` | "More tools": Locate me, Hide pins, Area stats. |
| `AreaStatsResultsModal.jsx` | Avg/min/max rent by BHK bucket for the drawn rectangle, via `useAreaStats`. |
| `HowToUseTour.jsx` | Guided first-visit tour — auto-launches the first time anyone lands on `/` (`isHowToUseTourSeen()`/`localStorage`'s `how-to-use-tour-seen`), also reachable any time via the nav pill row's "How to use" link (`/how-to-use`). Steps spotlight real UI elements by targeting `data-tour="..."` attributes already present on them (`data-tour="search-bar"`/`"nav-pill-row"`/`"spot-to-let"`/etc., set directly on `SearchBar`/`TopNavPill`/`IconStack`) — a step with no selector renders a plain centered card instead of a spotlight. |
| `SuperheroesModal.jsx` | To-let-spotter leaderboard (ranked by `hero_points`), showing each spotter's self-chosen `hero_nickname` (never their real name — see `toletSpots.js` below). |
| `LandingCard.jsx` | Pre-map splash shown on every fresh visit — 2×2 tile grid, "₹0 brokerage" badge, links out to `LegalModal.jsx` and to `/about`/`/contact`. Its own "Share" button's WhatsApp message links to the real production URL (`https://chitwan-rent.vercel.app`) — confirmed current, not a leftover placeholder. |
| `LegalModal.jsx` | Privacy Policy / Terms of Use as a modal — see the routing note above for how this differs from the standalone `/privacy`/`/termofuse` pages. |
| `ScrollToTop.jsx` | Mounted once in `App.jsx`; resets scroll position on every client-side `<Link>` navigation between the standalone pages (React Router doesn't do this automatically). |
| `StubModal.jsx` | Generic "coming soon" placeholder shell for not-yet-built features. |

### Primitives (`components/*.jsx` + `components/ui/`)

- **`Modal.jsx`** — the base centered-card modal shell (dimmed/blurred backdrop,
  close button) nearly every modal above is built on, including
  `InternalDashboardPage.jsx`'s own confirm dialogs (per-flat delete, and
  `FlatStatusPage.jsx`'s mark-rented/delete confirms) — no separate modal
  system was introduced for those.
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
`useUploadToletPhoto`, `useReportToletSpot`,
`useCreateRentReport`, `useAddFlatPhotos`, `useRemoveFlatPhoto`, `useRateFlat`,
`useFlatInterest`, `useCreateFlatComment`, `useReportFlat`.

There is **no `useRentReports` read hook** — `useCreateRentReport` is write-only
(see the `RentReportsLayer` note above). There is also no delete-flat/
mark-rented hook: `FlatStatusPage.jsx` calls `postJson` from `lib/api.js`
directly for both actions rather than going through a `useMutation` wrapper,
same reasoning as the `DeleteFlatPage.jsx` it replaced — it's a one-off
standalone page, not a `MapShell`-embedded flow. `InternalDashboardPage.jsx`
similarly doesn't use these hooks at all — it has its own separate
`lib/dashboardApi.js` (see "Internal dashboard" below), since it authenticates
with a session cookie rather than the per-user Bearer token every hook above
relies on via `lib/api.js`.

The one exception is **`usePinDropFlow.js`** — not a data hook but the shared
`onboarding → pin-drop → form` state machine both List My Flat and Find a Flat
are built on (keyed to a route path, so only one instance is ever active; auth
is handled separately at submit time — see the auth-gating note above).

### `lib/` — framework-free utilities

| File | Purpose |
|---|---|
| `api.js` | `fetchJson`/`postJson`/`patchJson`/`deleteJson` — attach the stored JWT as a Bearer header automatically. Plus `postFormData`, kept separate from `postJson` rather than branching inside it: `postJson` always sets `Content-Type: application/json`, while a `FormData` body needs the browser to set that header itself (with the multipart boundary), which only happens if nothing sets it explicitly. Used only by `useUploadToletPhoto`. |
| `dashboardApi.js` | Separate client for the internal dashboard — every call sets `credentials: "include"` instead of an Authorization header, since that surface authenticates via a session cookie, not a per-user token. See "Internal dashboard" below. |
| `mapConfig.js` | Map center/default zoom, tile URLs (dark base + labels overlay, satellite), Chitwan bounding box, Nominatim viewbox string. |
| `mapIcons.jsx` | Every Leaflet `divIcon` factory in the app (POI pins, flat info chips, cluster badges, the user-location dot, drag handles, "Your Pin" marker, place labels...) — one place all marker HTML/CSS lives. |
| `poiTiers.js` | The shared zoom-tier reveal system (`POI_TIER_1_ZOOM`…`POI_TIER_5_ZOOM`, `CATEGORY_TIER`, `poiTierForZoom`) plus `getHalfwayLabelZoom`, a reusable helper for categories (currently just schools) whose label should reveal proportionally rather than at a fixed offset. |
| `clusterBehavior.js` | `createClusterClickHandler` — replaces `react-leaflet-cluster`'s own default click handler (no public option exists to configure this, so the fix re-registers the underlying `leaflet.markercluster` listener directly) for two things: a smooth `flyTo`-based zoom animation instead of the library's own CSS-transition path (which silently jump-cuts at 250ms regardless of the configured duration), and the "never splits → show `NearbyFlatsModal.jsx` instead of spiderfying" behavior used by `FlatsLayer.jsx`. |
| `geo.js` | `haversineMeters` + `findNearest` (nearest area-centroid lookup). |
| `geocode.js` | `reverseGeocodeArea` — Nominatim reverse geocode with a 5s timeout, falling back to the nearest known area centroid so pin-drop flows never block on the network. |
| `filters.js` | `DEFAULT_FILTERS`, `buildFlatsQueryParams`, `countActiveFilters`. `DEFAULT_FILTERS.availableOnly` is `false` — the map's default fetch sends no `status` filter at all (relevant to the server-side `status != 'rented'` exclusion — see "Rent-cap system"/mark-as-rented note below). |
| `format.js` | `formatRs`, `formatRsCompact`, `bhkLabel`, `formatRelativeTime`, `formatShortDate` ("9 Aug" — en-GB specifically, for its day-before-month order; used by `ToletSpotDetailCard`'s header where "3 days ago" doesn't fit). |
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
│   ├── db.js            pg Pool + query()/withTransaction() helpers
│   ├── lib/              Shared server-side logic — see table below
│   └── routes/           One file per resource
└── db/                  Schema, migrations, and data-seeding scripts (run manually, not on boot)
```

### `src/routes/` — one file per resource

| Route | Covers |
|---|---|
| `flats.js` | List/filter/get/create flats, photo attach, comments, ratings, "I'm interested" submissions (see "Interest submissions" below), `POST /:id/delete`, and `POST /:id/mark-rented` (see "Email verification & flat deletion / status" below). A new listing is created with `status = 'pending_verification'` and only ever reaches `'available'` via the emailed verification link — there is **no** auto-flip timer anymore. `GET /` unconditionally excludes `pending_verification` rows, anything with `report_count >= 3`, **and (added alongside mark-rented) anything with `status = 'rented'`** — the last one closes a real gap: before it existed, a rented flat rendered on the default map exactly like a live one, since nothing on the client reads `flat.status` for marker styling and the map's default fetch sends no `status` filter at all (see `lib/filters.js` above). `?status=available` *also* excludes `is_seed = true` rows. |
| `seekerPins.js` | List/get/create seeker pins, plus `GET /by-email` (see "Seeker-pin archive flow" below). Creation sets `unsubscribe_token` and `next_digest_at` (`now() + 12h`) — seeker pins have no verification step, so creation is the moment a pin becomes "active" for matching purposes. |
| `toletSpots.js` | List/create to-let board spots; creating one increments the spotter's `hero_points` and flips their role to `superhero`. The submission's `name` field is really a self-chosen nickname now (relabeled in `SpotToLetModal.jsx`) — set once into `users.hero_nickname` via `COALESCE` (first submission wins, never overwritten) and deliberately never written to `users.name`, so a made-up nickname can never corrupt someone's real name. `GET /` joins in `hero_nickname` for `ToletSpotsLayer.jsx`; `superheroes.js` does the same for the leaderboard — neither ever exposes `users.name`. Also has `POST /upload-photo` (Cloudinary) and `POST /:id/report` — see "To-Let spot photo storage" below. |
| `areas.js` | The curated ward/tole list (`areasData.js`) merged with live per-area flat counts — always returns every seeded area, even with zero current listings. Powers the `Neighbourhood` filter dropdown. |
| `places.js` | The full OSM-sourced places gazetteer (villages/towns/suburbs/neighbourhoods/hamlets) — powers the search bar's local typeahead alongside flat `area` values. Deliberately separate from `areas.js`. |
| `pois.js` | Schools/colleges/restaurants/hospitals/temples/landmarks/pharmacies, optionally filtered by `?category=`. |
| `busRoutes.js` | Static bus route polylines. |
| `stats.js` | `/nearby` (median rent by BHK within a radius), `/nearby-seekers` (seeker count within a radius), `/area` (avg/min/max rent by BHK within a bbox). |
| `superheroes.js` | To-let-spotter leaderboard, ranked by `hero_points`. `WHERE u.hero_points > 0 AND u.is_seed = false` — seed users (`seed.js`'s 10 dummy spotters, backfilled by `add-users-is-seed.js`) never show up on the real leaderboard, indistinguishably from a real spotter, the way they used to before `users.is_seed` existed. |
| `auth.js` | `/login` — dummy email/phone identity, issues a JWT. |
| `rentReports.js` | `GET`/`POST /api/rent-reports` — anonymous rent data points (no auth). Fully standalone: no `owner_id`/`user_id`/`status` column, never joined against by verification, the rate-limit, or the digest job. **`rent_reports.is_dummy` is still present in the live DB right now** (confirmed via a direct `information_schema` query while writing this doc, not assumed) — see the dev-scripts callout in `db/` below: the migration and seed script that created it were never committed, so this column is DB-only drift, not a reproducible part of the schema. **Still no client code reads this endpoint at all** — reconfirmed live for this doc update (see the `RentReportsLayer` note above) — the internal dashboard's "Data hygiene" section (see below) surfaces the `is_dummy` gap explicitly rather than guessing at it. |
| `verifyListing.js` | `GET /verify-listing?token=` — mounted at the bare path (not `/api`), since it's the literal link clicked from the verification email, not a JSON endpoint. Renders a small standalone HTML success/failure page. See "Email verification & flat deletion / status" below. |
| `unsubscribe.js` | `GET /unsubscribe?token=` — same "bare path, server-rendered HTML page" shape as `verifyListing.js`, for the link in weekly digest emails. See "Weekly match digest" below. |
| `dashboard.js` | The internal, password-gated operator dashboard's entire API surface, mounted at `/api/internal/dashboard`. See "Internal dashboard" below for the full section list. |

`requireAuth` (from `src/lib/auth.js`) gates every write endpoint that needs to
attribute a submission to a user; read endpoints, `rentReports` (anonymous by
design), `verifyListing`, `unsubscribe`, and `flats.js`'s `POST /:id/delete` /
`POST /:id/mark-rented` (the 10-digit code itself is the credential) don't
require it. `dashboard.js` uses neither — it has its own, separate
`requireDashboardAuth` (session cookie, not a per-user JWT) — see "Internal
dashboard" below.

### `src/lib/` — shared server-side logic

| File | Purpose |
|---|---|
| `auth.js` | `requireAuth` middleware — verifies the per-user JWT, attaches `req.userId`. |
| `dashboardAuth.js` | The internal dashboard's own, separate auth: signed session cookie (not a per-user JWT), IP-based login rate limiting, timing-safe password comparison. See "Internal dashboard" below. |
| `geo.js` | `haversineDistanceMeters` + `isNearAnyRoute` (bus-route proximity). |
| `email.js` | Every outbound email in the app, sent via **SendGrid** (`@sendgrid/mail`, `SENDGRID_API_KEY`) from `chitwanrent@gmail.com` — verified in SendGrid as a **Single Sender** (one specific address, not a whole domain). One HTML template shell per email type, all built with the same purple-header card style: `sendVerificationEmail`, `sendDeleteCodeEmail`, `sendReportRemovalEmail`, `sendInterestNotificationEmail`, `sendSeekerConfirmationEmail`, `sendFlatMatchDigest`, `sendSeekerMatchDigest`, `sendCombinedDigest`. Has the app's one `escapeHtml` helper — needed because these templates are the only place free-text user data (`users.name`, contact fields, report reasons, interest notes) gets interpolated into HTML. **Not the original transport** — this is the third: Nodemailer/Gmail SMTP (`EMAIL_USER`/`EMAIL_PASS`) shipped first but doesn't work on Render's free tier (outbound SMTP connections there time out); Resend (an HTTPS email API, not SMTP) replaced it next, but without a purchased/verified domain its only sending option is a shared sandbox address that only ever delivers to the Resend account's own signup email — useless for real users. SendGrid's Single Sender Verification is what actually solves this without owning a domain: one verified real address, sends to anyone, over HTTPS (so Render's SMTP block stays irrelevant either way). `EMAIL_USER`/`EMAIL_PASS` and `RESEND_API_KEY` are both fully removed — no dead config left behind. |
| `verification.js` | `generateVerificationToken` / `generateUnsubscribeToken` (both 256-bit, URL-safe, plain-text — compared directly on lookup, not hashed, since they're link parameters rather than user-typed credentials) and `verifyListingByToken` — the one atomic `UPDATE ... RETURNING` that flips a flat from `pending_verification` to `available` and, in the same statement, sets `email_verified_at`, generates `delete_code_hash` and `unsubscribe_token`, and sets `next_digest_at = now() + 12h`. |
| `deleteCode.js` | `generateDeleteCode` (10-digit, CSPRNG), `hashDeleteCode` (sha256, no salt — code is already high-entropy and machine-generated), `deleteCodeHashMatches` (timing-safe compare). |
| `flatCodeVerification.js` | `verifyFlatDeleteCode(flatId, code)` — the code-format/eligibility/brute-force/hash-match check, extracted out of what used to be inline in `POST /:id/delete` so `POST /:id/mark-rented` can require the exact same check without duplicating it (see "Email verification & flat deletion / status" below). |
| `listingRateLimit.js` | `checkListingRateLimit` / `recordListingAttempt` — one flat listing per email per 24h, tracked in `listing_attempts` regardless of whether the resulting listing ever gets verified. |
| `deleteAttemptLimit.js` | `checkDeleteAttemptLimit` / `recordFailedDeleteAttempt` — brute-force throttle shared by both `POST /:id/delete` and `POST /:id/mark-rented` (5 failed attempts / 15 min, scoped to the flat ID — a wrong guess on either action counts toward the same lockout, since it's the same code either way), backed by `flat_delete_attempts`. |
| `cleanupExpiredListings.js` | Hourly job (`startExpiredListingsCleanup`): hard-deletes `flats` rows still `pending_verification` 24h after creation (owner never clicked the link). |
| `digestJob.js` | The weekly match-digest job — see below. |
| `cloudinary.js` | Configures the shared Cloudinary client (`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`) used by `routes/toletSpots.js`'s `POST /upload-photo` — see "To-Let spot photo storage" below. |

### Email verification & flat deletion / status

Every real (non-seed) flat listing goes through: **create** (`POST /api/flats`,
`status = 'pending_verification'`, rate-limited via `listingRateLimit.js`,
`sendVerificationEmail`) → **verify** (owner clicks the emailed link →
`GET /verify-listing?token=` → `verifyListingByToken` → `status = 'available'`,
`delete_code_hash` + `unsubscribe_token` + `next_digest_at` all set in the same
atomic update → `sendDeleteCodeEmail` fires with the plaintext 10-digit code,
which is never stored or logged) → optionally, from `/flatstatus`
(`pages/FlatStatusPage.jsx`, replacing the old `/deleteflat` +
`DeleteFlatPage.jsx`), **mark as rented** or **delete** — both gated by the
exact same code check (`lib/flatCodeVerification.js`'s `verifyFlatDeleteCode`,
extracted specifically so neither route duplicates it): 10-digit format, only
allowed once 24h past verification, brute-force-limited by
`deleteAttemptLimit.js` (shared between both actions), timing-safe hash
compare against `delete_code_hash`. **Mark as rented** (`POST /:id/mark-rented
{ code }`) sets `status = 'rented'` — a soft action, the row and all its
history (ratings/comments/reports/interests) survive; this is what the
`GET /` route's `status != 'rented'` exclusion (see `flats.js` above) actually
takes off the live map. **Delete** (`POST /:id/delete { code }`) is unchanged
from before — a hard `DELETE FROM flats`, with dependent rows across
`flat_ratings`/`flat_comments`/`flat_reports`/`flat_interests`/`matches`/
`flat_delete_attempts` all cascading via `ON DELETE CASCADE`. An unverified
listing that never gets clicked is swept up by `cleanupExpiredListings.js`
instead. The dashboard has a *separate*, no-code, operator-only single-flat
delete (see "Internal dashboard" below) that deliberately does not touch or
reuse any of this code-verification logic.

### Rent-cap system

Fixed, BHK-based rent caps (`AddFlatForm.jsx`'s `RENT_CAPS` — no percentage or
furnished/gated/parking multipliers): `{1: 15000, 2: 30000, 3: 45000, 4: 60000,
5: 100000}` (5+ BHK uses the 5-BHK cap). Three tiers, all client-side in
`AddFlatForm.jsx`:

1. **Soft warning** — rent above the BHK's cap shows a red inline warning
   under the rent field. Informational only; doesn't block Proceed by itself.
2. **Confirm-and-flag** — clicking Proceed while the soft warning is active
   opens `RentCapConfirmModal.jsx` ("Double-check this pin?"). "Let me
   re-check" changes nothing; "Yes, it's correct" submits the listing with
   `rentFlagged: true`, which the server persists as `flats.rent_flagged =
   true`. A flagged listing stays fully visible on the map and under
   `?status=available` — it's excluded *only* from `digestJob.js`'s matching
   pool (`ACTIVE_FLATS_SQL` filters `rent_flagged = false`), same exclusion
   shape as `is_seed` but a different reason.
3. **Hard ceiling, no override** — more than **double** the BHK's cap
   (`rentCeiling = rentCap * 2`). Proceed simply refuses at this tier: a red
   "can't be accepted" message shows, the form stays open, there is no
   confirm/flag path at all. This tier cannot be talked past.

### Seeker-pin archive flow

Before creating a new seeker pin, the client calls `GET /api/seeker-pins/
by-email?email=` (public, no auth) with the email just entered in
`DropSeekerPinForm.jsx`. **Matching is by email only** — not phone, not
`user_id`. If that email already has any `seeker_pins` rows (active and/or
already-archived), `ArchiveCheckPinsModal.jsx` shows before submission: active
pins are listed with checkboxes (pre-checked by default), archived ones are
shown read-only for context. The chosen action posts `archive_pin_ids` to
`POST /api/seeker-pins` alongside the new pin's own fields; the server archives
exactly those ids, scoped to `id = ANY($1) AND email = $2 AND archived_at IS
NULL` — never touches pins the user left unchecked, and never touches a
different email's pins even if an id were somehow spoofed. **Archiving is
permanent** — `seeker_pins.archived_at` is one-directional, nothing in this
feature ever sets it back to `NULL`. An archived pin disappears from the map
(`GET /api/seeker-pins` filters `archived_at IS NULL`) and from digest
matching (`digestJob.js`'s `ACTIVE_SEEKERS_SQL`, same filter) — it isn't just
excluded from future matches, it stops being shown as an active search at all.

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

**Recipients are grouped by email before sending, not sent one email per due
row.** All due flats and due seeker pins are matched and rescheduled first,
independently of each other; only at the very end are the rows that actually
have matches grouped by owner/seeker email (`rowsByEmail`). If an email owns
exactly one due, matched row this run, it gets the existing single-purpose
email (`sendFlatMatchDigest` or `sendSeekerMatchDigest`). If the same email
owns **more than one** due, matched row (e.g. two listings, or a listing and a
seeker pin, all due the same run), it gets exactly **one** `sendCombinedDigest`
email instead — one labeled section per item, each with its own recap, its own
matches, and its own unsubscribe link (sections are never merged, so
unsubscribing from one doesn't touch the others). A row's own schedule/matches
never depend on what else happens to be due for the same email this run —
grouping only affects how the *send* is packaged at the end.

Each run's summary (`{ flatDigestsSent, flatDigestsSkipped, seekerDigestsSent,
seekerDigestsSkipped, dueFlats, dueSeekers }`) is logged to the `digest_runs`
table (one row per run, added for the internal dashboard's "Digest job health"
section — see below) — this never existed before that section was built;
previously the only record of a run was `console.log` output.

The `matches` table (originally built for an earlier one-time "email on first
match" version of this feature) is kept but **repurposed** as an
analytics-only "last seen compatible" log (`matched_at` upserted on every
compatible pair found) — nothing reads it to gate a send anymore.

`unsubscribe.js`'s `GET /unsubscribe?token=` hard-deletes the matching `flats`
or `seeker_pins` row by its (long-lived, plain-text) `unsubscribe_token`. It
never touches `listing_attempts`, so it cannot reset or bypass the 24h listing
rate-limit.

`db/run-digest-now.js` (`npm run digest:run-now`) is a dev-only manual
trigger — runs one real pass of `runDigestJob()` on demand, for local testing
without waiting on the hourly interval or restarting the server. It calls the
job's own exported function rather than reimplementing any of its query/match
logic, and doesn't reset/bypass `next_digest_at` for anything — to re-test a
specific row sooner than its real schedule, its `next_digest_at` has to be
pushed back manually via SQL first.

### Report removal

`POST /:id/report` (in `flats.js`) increments `flats.report_count`; `GET /`
unconditionally excludes any flat with `report_count >= 3`
(`REPORT_REMOVAL_THRESHOLD`) from every filter combination, same treatment as
`pending_verification`. The moment a flat's count crosses that threshold (not
on every report after — the flat's already off the map by then),
`sendReportRemovalEmail` fires to the owner, and — **new** —
`flats.report_removal_email_sent_at` is set, but *only* right after the send
call actually resolves without throwing; a failed send (same log-and-continue
contract as every email in this app) leaves it `NULL`. Rows that crossed the
threshold *before* this column existed are also `NULL`, indistinguishably from
a real send failure by the column alone — the internal dashboard's Reports
section tells the two apart using a hardcoded cutover timestamp
(`REPORT_REMOVAL_EMAIL_TRACKING_STARTED_AT` in `flats.js`, set to this
column's migration-run time) compared against the actual timestamp of the
report that crossed the threshold, rather than guessing — see "Internal
dashboard" below.

### Interest submissions

`POST /:id/interest` (`flats.js`) — collects **email + phone (via login) and
contact info; no `name` field anymore** (removed from `InterestForm.jsx`;
`flat_interests.name` stays in the schema, already nullable, just never
populated by this route going forward), plus three optional fields: `move_in`
(same vocabulary as `flats.available_from`), `gender` (same vocabulary as
`seeker_pins.gender` — an identity field, distinct from
`flats.flatmate_gender_pref`, which is a preference for others), and
`parking_required` + `parking_count` (the count is only ever persisted when
`parking_required` is actually `true` — enforced server-side, not just trusted
from the client). On success, the route also fires `sendInterestNotificationEmail`
to the flat's owner (log-and-continue on failure, same contract as every other
email here) — this is a real gap that was investigated and fixed this session:
previously `flat_interests` rows were saved but **nothing** ever surfaced
them anywhere (not the owner, not any UI) despite the CTA's copy claiming an
email would be sent; that copy is now accurate. **Interests are now visible**
in the internal dashboard's own "Interests" section (see below) — actual
submission content (contact/note/move-in/gender/parking), not just a count.
No `flats.interest_count` materialized column was added (considered, but
judged not worth a second write-path to keep in sync at this app's traffic
size — the dashboard section alone satisfies the visibility gap).

### To-Let spotting

The gamified "spot a board" layer: submit via `SpotToLetModal.jsx`, browse as
pins via `ToletSpotsLayer.jsx`, open one via `ToletSpotDetailCard.jsx`.

**Visibility is purely zoom-based.** Pins render only at
`TOLET_SPOTS_MIN_ZOOM` (14) and above — two steps past `DEFAULT_ZOOM` (12) —
so the opening map is free of them, same "don't clutter the default view"
reasoning as `poiTiers.js`, just one flat threshold instead of a tier ladder.
There used to be a `showToletBoards` filter toggle gating this instead, and
it was removed outright rather than kept alongside the zoom rule: because it
defaulted to `false` on every load and also gated the *fetch*
(`useToletSpots(enabled)`), a fresh visit or refresh produced no to-let data
at all no matter how far you zoomed. That was the actual cause of a
"pins don't show after refresh" bug — the query was disabled, not the pins
hidden. `useToletSpots()` now always fetches, and `DEFAULT_FILTERS` has no
`showToletBoards` key at all.

Nearby pins cluster through `MarkerClusterGroup` the same way flats do, with
a single-line `"<n> TO-LET"` badge (`createClusterBadgeIcon` collapses to a
compact one-line layout when no `line2` is passed).

**Reporting and auto-removal.** `POST /api/tolet-spots/:id/report`
(`requireAuth`) is the "Board gone / wrong" action. Unlike flats' own report
route it genuinely dedupes per reporter: `tolet_spot_reports` carries a
`UNIQUE(tolet_spot_id, user_id)` constraint, and the insert is
`ON CONFLICT DO NOTHING` — whether a row was actually inserted is what
decides if the count moves, so a repeat report from the same user is a no-op
(returns `alreadyReported: true`) rather than double-counting. At
`TOLET_REPORT_REMOVAL_THRESHOLD` (3) the spot flips to `status = 'removed'`;
`GET /api/tolet-spots` filters `status != 'removed'`, so it leaves the map on
the next refetch. **Never a `DELETE`** — the row and its report history stay
for moderation review (surfaced in the dashboard's own To-Let spots section).

### To-Let spot photo storage

`tolet_spots.photo_url` moved from base64-in-Postgres to Cloudinary. Every
row that existed before this migration had its `photo_url` explicitly
cleared to `NULL` (`db/clear-tolet-spot-photos.js`, a one-off cleanup script
— same `remove-*.js` pattern as `remove-blue-pois.js` etc. below, not a
schema migration, since no column/table changed) — those old base64 values
were never migrated forward, just dropped; every other column
(`id`/`spotter_id`/`lat`/`lng`/`report_count`/`status`/etc.) on those rows is
untouched.

Every *new* spot now stores a real Cloudinary URL instead. `src/lib/
cloudinary.js` configures the shared client from three server-only env vars
(`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` — never
sent to the client; there's no unsigned/public-key browser-upload path here,
every upload goes through this server's own auth). `SpotToLetModal.jsx`'s
submit is two sequential requests: `POST /api/tolet-spots/upload-photo`
(`requireAuth`, `multer` with `memoryStorage` — not `diskStorage`, since
Render's filesystem is ephemeral — streams the buffer straight to
Cloudinary's `tolet-spots` folder, no disk write at all) returns a
`secure_url`, which is then sent as `photo_url` to the existing
`POST /api/tolet-spots`. The modal shows a distinct "Uploading photo…" state
for the first request before "Putting it on the map…" for the second, and
the two failure modes surface as separate messages (`uploadError` vs.
`submitError`) rather than one generic one.

**Flat listing photos are a different, untouched path.** `flats.photos`
still reads as base64 client-side (`FileReader.readAsDataURL` in
`ListFlatSuccessModal.jsx`) and stores directly in Postgres via
`hooks/useAddFlatPhotos.js` — the same pattern `tolet_spots.photo_url` used
before this migration. Flagged here since it's the same shape, not migrated
alongside it — doing so wasn't part of this change and would need its own
confirmation first.

### Internal dashboard

A single internal-only, password-protected operator tool — not linked from any
nav, sitemap, or public page; the route name is a mild extra layer on top of
the real protection (the password itself).

- **Route:** `/internal/dashboard` (client) → `/api/internal/dashboard/*`
  (server, `routes/dashboard.js`). An unmatched sub-path like
  `/internal/dashboard/listing` isn't a real route at all — it falls through
  to `MapShell`'s own catch-all and just renders the ordinary map (confirmed
  live; this is harmless routing fallback behavior, not a way to bypass the
  password).
- **Auth:** one shared password (`DASHBOARD_PASSWORD` env var — server
  refuses login with a `503` if unset), no per-admin accounts. On success, a
  JWT-signed session cookie (`dashboard_session`) is issued: `HttpOnly`,
  `6h` `Max-Age`/expiry (both agree with each other), `Path=/`, not narrowed
  to the dashboard's own API prefix — low risk since no other route on this
  server reads this cookie, but broader than strictly necessary.
  `SameSite`/`Secure` are environment-conditional, not fixed: in production
  (`NODE_ENV=production`) the cookie is `SameSite=None; Secure` — required
  because the frontend (Vercel) and backend (Render) are different origins in
  production, and `SameSite=Lax` cookies are **not** sent on cross-site
  requests by default (this was a real bug: dashboard login appeared not to
  persist in production because the session cookie was set successfully but
  never sent back on the next request — fixed by this env-conditional
  switch). In dev, it stays `SameSite=Lax` with no `Secure`, since local
  `http://` would otherwise silently drop a `Secure` cookie. `NODE_ENV=production`
  is now actually set on the Render deploy (previously this was a documented
  gap — the var wasn't confirmed to be set at all, so `Secure` may never have
  applied), so this environment-conditional logic is no longer resting on an
  unconfirmed assumption. Login attempts are rate-limited by IP (5 attempts /
  15 min, `dashboard_login_attempts` table, same sliding-window shape as
  `deleteAttemptLimit.js`), and the password comparison itself is
  timing-safe (`crypto.timingSafeEqual`, not `===`). `requireDashboardAuth`
  is applied via `router.use(...)`, so it gates *every* request under the
  mount point, matched route or not — an unmatched API sub-path still gets a
  `401`, not a `404`, before Express would even look for a handler.
- **Sections** (`InternalDashboardPage.jsx`, in on-screen order):
  1. **Recent listings** — `id`/`status`/`bhk`/`rent`/`posted_at`/`is_seed`,
     filterable by status, plus owner `id`/`email` (joined in specifically so
     the delete-user search below doesn't need a manual SQL join) — and a
     per-row **delete** action (own confirm modal, no code required — this
     is the dashboard's own operator override, entirely separate from
     `POST /:id/delete`'s code-verified flow and doesn't touch or reuse it).
  2. **Reports** — flats with `report_count > 0`, whether each has crossed
     the removal threshold, and the removal-email outcome (actual timestamp /
     `"not sent"` / `"unknown (removed before this was tracked)"` — see
     "Report removal" above for how those are told apart).
  3. **Interests** — `flat_interests` submission content per flat (contact,
     move-in, gender, parking, note, when) — see "Interest submissions" above.
  4. **Digest job health** — due-vs-not-due counts for flats and seeker pins
     (reusing `digestJob.js`'s own `ACTIVE_FLATS_SQL`/`ACTIVE_SEEKERS_SQL` as
     subqueries, not a hand-copied filter) and the last logged run from
     `digest_runs` — see "Weekly match digest" above.
  5. **Rate-limit lookup** — search `listing_attempts` by email directly, or
     by phone (resolved to a `users.email` first, since `listing_attempts`
     itself has no phone column) — shows attempt history and when the 24h
     window clears.
  6. **Data hygiene** — `is_seed` true/false counts for `flats`/`seeker_pins`/
     `users`, plus an explicit note that `rent_reports` has no `is_seed`/
     `is_dummy` column of its own in the schema (the `is_dummy` column that
     *does* exist right now is uncommitted drift — see the `db/` callout
     below) and is never seeded by `seed.js`, so every row is real by
     construction.
  7. **Delete a user** — look up by id or email only (not phone — deliberately
     narrower than the rate-limit lookup above), preview of everything that
     would cascade, then a typed-confirmation ("type the id to confirm")
     delete. None of the tables referencing `users.id` have `ON DELETE
     CASCADE` at the DB level, so this runs inside one transaction
     (`db.js`'s `withTransaction` — the first transaction anywhere in this
     app) that explicitly deletes the user's own authored rows on others'
     listings, their seeker pins, their to-let spots, and their own flats
     (whose cascades then clean up ratings/comments/reports/interests on
     those specific flats) before the user row itself.
  8. **To-Let spots** — two tables, active (`status != 'removed'`) and
     removed, each showing id / spotted-at / spotter `hero_nickname` / lat /
     lng / `report_count` / status. The removed table adds an audit column
     counting actual `tolet_spot_reports` rows, shown *beside* the
     materialized `report_count` rather than collapsed into it — they should
     always agree, and a mismatch renders in red because that's exactly what
     this view exists to catch. **`photo_url` is never selected** by either
     query (columns are listed explicitly, not `t.*`), so board photos can't
     surface here even by accident. No seed-vs-real split: `tolet_spots` has
     no `is_seed` column, and unlike `rent_reports` its rows are *not* all
     real by construction (`db/seed.js` does create to-let spots), so the
     section states that gap instead of guessing.
- **`lib/dashboardApi.js`** (client) — every call uses
  `credentials: "include"` instead of a Bearer header, since this surface
  authenticates via cookie.

---

## `db/` — schema, migrations, and seed data

- **`schema.sql`** — the full destructive schema (drops and recreates every
  table). Only ever run against a throwaway dev DB via `run-schema.js`. **Stale
  relative to the migrations below** — e.g. it has neither `flats.rent_flagged`
  nor `flats.report_removal_email_sent_at` nor `seeker_pins.archived_at` nor
  `users.is_seed` nor `flat_interests.move_in`/`gender`/`parking_required`/
  `parking_count` nor `tolet_spots.report_count`/`status`, and doesn't define
  `dashboard_login_attempts`, `digest_runs`, or `tolet_spot_reports` at all.
  A from-scratch DB needs `db:schema` **followed by every `add-*.js` migration
  below, in order** — `schema.sql` alone will not get there. Don't do that by
  hand: **`migrate-all.js`** (below) is the one command that does it.
- **`migrate-all.js`** (`npm run db:migrate`, from the root or `server/`) —
  runs `db:schema` and then every migration in `MIGRATIONS`, in order,
  stopping at the first failure. That order is **not** alphabetical and not
  guessed: it was derived from this repo's real commit history
  (`git log --reverse --diff-filter=A -- server/db/`), which caught two
  genuine ordering mistakes in the hand-written list this replaced. Each
  migration runs as its own child process, so all of them stay individually
  runnable (`node db/<file>.js`) and none needed editing to be orchestrated.
  Deliberately does **not** run `db:seed` — seeding is a separate choice.
  **A new migration has to be appended to `MIGRATIONS` too**, or a
  from-scratch setup silently skips it.
- **`seed.js`** — the main dummy-data generator: users, flats, seeker pins,
  to-let spots, rent reports, scattered across the areas in `areasData.js`
  weighted by density. Marks its own rows `is_seed = true` on `flats`,
  `seeker_pins`, and `users`, so they're excluded from the digest job and from
  `?status=available` on `GET /api/flats` (and from the superheroes
  leaderboard, and counted separately in the dashboard's Data hygiene
  section). **Never seeds `rent_reports` itself** — see the Data hygiene note
  above.
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
  runnable scripts — see the callouts below for tables that don't.
- **Additive migrations** — `CREATE TABLE/COLUMN IF NOT EXISTS`, safe to run
  against a dev DB that already has data; this is the pattern used for every
  schema change instead of re-running `schema.sql`. **`MIGRATIONS` in
  `migrate-all.js` is the authoritative run order** — the inventory below is
  descriptive only and is *not* ordering-accurate (an earlier hand-maintained
  ordering here was found to be wrong in two places; rather than re-syncing a
  second copy by hand forever, defer to the code). The full set:
  `add-flat-social-tables.js`, `add-rent-reports-table.js`,
  `add-poi-tier-column.js`, `add-flat-listing-details.js`,
  `add-places-table.js`, `add-flats-society-name.js`, `add-flats-is-seed.js`,
  `add-flat-reports-table.js`, `add-flat-verification.js`,
  `add-listing-attempts-table.js`, `add-flat-ratings-dimensions.js`,
  `add-flat-delete-code.js`, `add-delete-attempts-table.js`,
  `add-flats-description.js`, `add-flatmate-matching.js`,
  `add-digest-unsubscribe.js`, `add-next-digest-at.js`,
  `add-users-is-seed.js`, `add-hero-nickname.js`,
  `add-seeker-pins-archived-at.js`, `add-flats-rent-flagged.js`,
  `add-rent-reports-furnishing-parking.js`, `add-dashboard-tables.js`
  (`dashboard_login_attempts` + `digest_runs`),
  `add-flats-report-removal-email-sent-at.js`,
  `add-flat-interests-preferences.js` (`move_in`/`gender`/`parking_required`),
  `add-flat-interests-parking-count.js`,
  `add-tolet-spot-reports.js` (`tolet_spots.report_count`/`status` plus the
  `tolet_spot_reports` table — see "To-Let spotting" above). `add-flatmate-matching.js` created
  the `matches` table (see "Weekly match digest" above) and backfilled
  `seeker_pins.is_seed`; `add-digest-unsubscribe.js` added `unsubscribe_token`
  to both `flats` and `seeker_pins`; `add-next-digest-at.js` added
  `next_digest_at` to both.
  > **Not every migration has a matching `npm run add:*` script**, despite
  > that being the norm — checked `server/package.json` directly for this doc
  > update: `add-flat-social-tables.js`, `add-rent-reports-table.js`,
  > `add-poi-tier-column.js`, and `add-flat-listing-details.js` exist as files
  > but have no script entry and must be run directly (`node
  > db/<file>.js`). Every migration from `add-flats-society-name.js` onward
  > does have one.
- **Cleanup scripts** (`remove-bank-pois.js`, `remove-noisy-shop-pois.js`,
  `remove-hotel-pois.js`, `remove-blue-pois.js`) — one-off deletions of POI
  categories that were later decided against. `clear-tolet-spot-photos.js`
  is the same shape but clears a column rather than deleting rows — see "To-
  Let spot photo storage" above.

> **Uncommitted DB drift: `rent_reports.is_dummy`.** An earlier session built
> `add-rent-reports-is-dummy.js` (migration) and `seed-dummy-rent-reports.js`
> (a `--confirm`-gated script generating dummy rows within `CHITWAN_BOUNDS`,
> run via a `seed:dummy-rent-reports` npm script) and ran them against the
> live dev DB — the `is_dummy` column is still there right now (reconfirmed
> via a direct `information_schema` query for this doc update). But **neither
> file was ever committed**, both are gone from `server/db/` today, and
> `server/package.json` has no `add:rent-reports-is-dummy` or
> `seed:dummy-rent-reports` script. Treat this exactly like the
> `RentReportsLayer` situation above: the DB reflects work that doesn't exist
> in the repo, and reproducing it means rebuilding the scripts from scratch,
> not re-running something that's still there.

> **Further uncommitted DB drift, found while writing this update:
> `water_features` table and `flats.rating_count` column.** A live schema
> query for this doc turned up a `water_features` table (6 columns —
> `id`/`name`/`category`/`geojson`/`significant`/`intermittent` — 4,184 rows)
> and a `flats.rating_count` column, **neither of which has any matching code
> anywhere** — no route serves `water_features`, no migration script in
> `server/db/` created either of them, no client component references either
> name. Same shape as the two drift situations above: real, present, live DB
> state with zero corresponding code in the repo. Not something this session
> built or touched — flagged here purely so this doc doesn't silently omit
> real schema state.

---

## Deployment

The app is **live, not local-only** — frontend, backend, and database each run
on a separate host, which shapes a few things documented above:

- **Frontend:** Vercel, serving `client/`'s Vite build output. `client/
  vercel.json` adds one SPA rewrite rule (`{ "source": "/(.*)", "destination":
  "/index.html" }`) — without it, direct navigation or a page refresh on any
  client-side route (`/flatstatus`, `/internal/dashboard`, `/about`, etc.)
  would 404, since Vercel would otherwise look for a real file at that path
  instead of falling through to the SPA's own router. Vercel's rewrite
  behavior checks the filesystem first, so real static assets (the JS/CSS
  bundles, images) are unaffected — this only ever fires for paths with no
  matching file.
- **Backend:** Render, on its free tier — which spins the server down when
  idle and cold-starts it on the next request, taking 30-60s. Two things
  elsewhere in this doc exist specifically because of that: `email.js`'s move
  through Resend to SendGrid, both chosen because they're HTTPS APIs rather
  than SMTP (Render's free tier blocks/times-out outbound SMTP, which is what
  broke the original Nodemailer/Gmail transport — see the `email.js` entry
  above), and `InitialLoadScreen.jsx`'s rotating-tips loading card, built
  specifically to make that cold-start wait feel like part of the app instead
  of a stalled page (see the "Map chrome" table above).
- **Database:** Neon (managed PostgreSQL).
- **Cross-origin consequences:** frontend and backend being different origins
  in production is also why the internal dashboard's session cookie needed
  its `SameSite=None; Secure` fix (see "Internal dashboard" above) — a
  same-origin-only cookie policy silently doesn't survive a split-host
  deployment like this one.

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
- **Dummy auth, and a second, separate auth system for one internal tool.**
  No password/OTP anywhere in the public app — `requireAuth` only proves a
  request carries a token this server issued, good enough to attribute
  submissions to a consistent identity. The internal dashboard is the one
  exception: a genuinely separate, single-shared-password + session-cookie
  scheme (`lib/dashboardAuth.js`), deliberately not reusing `requireAuth` —
  see "Internal dashboard" above for why (there's no per-admin identity to
  attribute anything to).
- **Extract shared verification logic when two actions need the identical
  check — don't duplicate it.** `lib/flatCodeVerification.js` is the clearest
  example: `POST /:id/delete` and `POST /:id/mark-rented` both call the exact
  same `verifyFlatDeleteCode`, so the eligibility/brute-force/hash-compare
  logic can't drift between the two call sites. Same instinct shows up as
  cross-module `export`s used purely to keep one definition authoritative —
  e.g. the internal dashboard imports `REPORT_REMOVAL_THRESHOLD` from
  `flats.js` and `ACTIVE_FLATS_SQL`/`ACTIVE_SEEKERS_SQL` from `digestJob.js`
  rather than hand-copying either.
- **Two flavors of "secret token," chosen deliberately.** Long-lived tokens a
  user only ever clicks as a link (`verification_token`, `unsubscribe_token`)
  are stored **plain-text** and compared directly — they're not something a
  human ever types, so hashing them buys nothing. The delete/mark-rented code
  is different: it's manually typed back in by a human, so only its hash
  (`delete_code_hash`, sha256) is ever persisted, and the comparison
  (`deleteCodeHashMatches`) is timing-safe and rate-limited
  (`deleteAttemptLimit.js`, shared by both actions that use the code). Listing
  creation, delete/mark-rented attempts, and dashboard login attempts all
  share the same sliding-window rate-limit shape (`listingRateLimit.js` /
  `deleteAttemptLimit.js` / `dashboardAuth.js`'s login limiter) — a
  `COUNT(*) ... WHERE created_at > now() - interval` query against a
  dedicated attempts table, not an in-memory limiter.
- **Per-row schedules over global intervals.** The digest job's `setInterval`
  is just an hourly *check* — the actual cadence (12h after go-live, then
  every 7 days) lives per-row in each flat/seeker pin's own `next_digest_at`
  column. Compare `cleanupExpiredListings.js`, which has no per-row schedule
  at all and instead re-evaluates every `pending_verification` row's fixed
  24h window on every hourly pass.
