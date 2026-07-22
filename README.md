# chitwan.rent

A dummy-data clone of bengaluru.rent, reskinned for **Chitwan, Nepal**. PERN stack (PostgreSQL + Express + React/Vite + Node), free map stack (Leaflet + OpenStreetMap/CARTO tiles), currency displayed as **Rs. (NPR)**. Built in 10 phases — see `chitwan-rent-phased-build-prompt.md` for the original spec.

## Stack

- `/client` — Vite + React + Tailwind CSS + react-leaflet (+ react-leaflet-cluster) + React Query + React Router
- `/server` — Express + node-postgres (`pg`) + JWT (`jsonwebtoken`)
- PostgreSQL (tested against PostgreSQL 17 locally on Windows)

## Prerequisites

- Node.js 18+ (tested on v24)
- PostgreSQL running locally (or a connection string to a hosted instance)

## Setup

1. Install dependencies (root workspaces install both `client` and `server`):

   ```sh
   npm install
   ```

2. Configure environment variables:

   - `server/.env` (copy from `server/.env.example`):
     ```
     PORT=4000
     DATABASE_URL=postgresql://<user>:<password>@localhost:5432/chitwan_rent
     JWT_SECRET=dev_secret_change_me
     CLIENT_ORIGIN=http://localhost:5173
     ```
   - `client/.env` (copy from `client/.env.example`):
     ```
     VITE_API_URL=http://localhost:4000/api
     ```

3. Create the database (adjust user/host as needed):

   ```sh
   createdb -U postgres chitwan_rent
   ```

4. Apply the schema and seed the database:

   ```sh
   npm run db:schema
   npm run db:seed
   ```

   This creates the `users`, `flats`, `seeker_pins`, `tolet_spots`, `bus_routes`, and `pois` tables, then seeds:
   - 10 dummy users (hero_points shaped like a leaderboard: 20 / 3 / 2 / 1 / 1 / 0…)
   - 180 flats, weighted toward Bharatpur wards 5/10/11/14, tapering off toward Kalika/Rapti/Ichchhakamana, with NPR-realistic rents by BHK
   - 40 seeker pins
   - ~27 to-let spots (matches the leaderboard shape above)
   - 10 bus routes (approximate Chitwan road corridors, as GeoJSON LineStrings)
   - 25 points of interest (schools, colleges, temples, hospitals, landmarks)

5. Run both client and server in dev mode:

   ```sh
   npm run dev
   ```

   - API: http://localhost:4000 (health check at `/api/health`)
   - Client: http://localhost:5173

   Re-running `npm run db:seed` truncates and re-seeds every table (including `users`), so any accounts created via sign-in during testing are wiped along with it — that's expected for a dev/demo dataset.

## Auth

There's no real account system — signing in (via the "Sign in to continue" gate shown before listing a flat, dropping a seeker pin, or spotting a to-let board) just takes an email and/or phone number, no password or OTP. The server matches or creates a `users` row and returns a JWT, which the client stores in `localStorage` and attaches to write requests. See `server/src/lib/auth.js` and `POST /api/auth/login`.

## API overview

All routes are mounted under `/api`. Reads (`GET`) are open; writes that create a listing/pin/spot (`POST /api/flats`, `POST /api/seeker-pins`, `POST /api/tolet-spots`) require a `Bearer` token from `/api/auth/login`.

| Route | Notes |
|---|---|
| `/flats` | list + filter (bhk, rent range, area, furnishing, gated, posted-within, near-bus-route); `POST` creates (auth required) |
| `/seeker-pins` | list; `POST` creates (auth required) |
| `/tolet-spots` | list; `POST` creates (auth required), increments the spotter's `hero_points` |
| `/superheroes` | ranked leaderboard from `users.hero_points` |
| `/areas` | distinct ward names + centroids, derived from `flats` |
| `/bus-routes`, `/pois` | static seeded reference layers |
| `/stats/nearby` | median rent by BHK within a radius of a point |
| `/stats/area` | avg/min/max rent by BHK inside a drawn bounding box |
| `/auth/login` | dummy sign-in, returns a JWT |

## Feature checklist (Phases 0–9)

- [x] Phase 0 — Scaffold & data foundation
- [x] Phase 1 — App shell & map base
- [x] Phase 2 — Available flats + cluster badges + detail card
- [x] Phase 3 — Search + filter
- [x] Phase 4 — List My Flat
- [x] Phase 5 — Find a Flat
- [x] Phase 6 — Spot a To-Let + Superheroes
- [x] Phase 7 — Bus routes + school/college layer
- [x] Phase 8 — More panel: locate me / hide pins / area stats
- [x] Phase 9 — Polish & wrap-up (mobile pass, empty/loading states, JWT auth gating, seed-data sanity check)

## Known limitations

- Uploaded photos (to-let board snaps) are stored as base64 data URLs directly in Postgres — fine for this dummy-data scale, not how you'd do it in production (would want object storage + `multer`).
- No email delivery — "we'll email you when seekers match" is copy only, no matching job runs.
- Nominatim (OpenStreetMap) reverse-geocoding calls the public API directly from the browser; it's rate-limited and best-effort, with a same-district nearest-seeded-ward fallback if it fails or times out.
