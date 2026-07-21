# chitwan.rent

A dummy-data clone of bengaluru.rent, reskinned for **Chitwan, Nepal**. PERN stack (PostgreSQL + Express + React/Vite + Node), free map stack (Leaflet + OpenStreetMap/CARTO tiles), currency displayed as **Rs. (NPR)**.

This repo is built in phases — see `chitwan-rent-phased-build-prompt.md` for the full spec. This README covers Phase 0 (scaffold, schema, seed data).

## Stack

- `/client` — Vite + React + Tailwind CSS + react-leaflet + React Query + React Router
- `/server` — Express + node-postgres (`pg`) + JWT + multer
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

   - API: http://localhost:4000 (health check at `/api/health`, flats at `/api/flats`)
   - Client: http://localhost:5173

## Verifying Phase 0

```sh
curl http://localhost:4000/api/flats
```

should return a JSON array of ~180 seeded flat objects.

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
- [ ] Phase 9 — Polish & wrap-up
