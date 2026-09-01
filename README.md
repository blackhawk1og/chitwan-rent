# chitwan.rent

A map-first, brokerage-free rental listing platform for Chitwan district, Nepal.

## Live Demo

**[chitwan-rent.vercel.app](https://chitwan-rent.vercel.app)**

Frontend on Vercel, backend on Render (free tier), database on Neon. The
backend cold-starts after a period of inactivity — the first request can take
30-60s, during which the app shows an interactive loading screen rather than a
blank page.

## Overview

Renters browse available flats as pins on an interactive map instead of scrolling
a list; owners list a flat by dropping a pin themselves, with zero brokerage and
zero listing fees. Alongside listings, anyone can anonymously drop a pin showing
what rent they actually pay — an honest, crowdsourced counterweight to inflated
asking prices — and a gamified "Spot a To-Let" layer lets people photograph and
pin to-let boards they spot around town, with a public leaderboard for the most
active spotters.

## Features

- **Map-first browsing** — flats render as clustered pins on a live map of
  Chitwan district, filterable by BHK, rent range, neighbourhood, furnishing,
  gated status, how recently posted, and proximity to a bus route.
- **List a flat, free** — owners drop a pin and fill in listing details directly;
  no broker, no listing fee. Listings go live only after clicking a link in a
  verification email, and are rate-limited to one new listing per email every
  24 hours.
- **Find a flat** — seekers drop a pin describing what they're looking for
  (budget, BHK, move-in timeline, and more); a weekly digest email connects
  compatible seekers and owners automatically, within a 2km radius.
- **Rent-cap fairness check** — listed rent is checked against a typical range
  for its BHK. A rent that's unusually high still gets warned and flagged
  (excluded from matching, but still visible on the map); a rent more than
  double the typical range isn't accepted at all.
- **Self-service listing management** — an emailed 10-digit code lets an owner
  mark their own listing as rented or delete it outright, starting 24 hours
  after verification — no login required.
- **"I'm interested"** — a lightweight way to express interest in a listing
  (with optional move-in timeline, gender, and parking needs); the flat's owner
  is emailed the interested party's contact directly.
- **Community ratings, comments, and reporting** — real listings can be rated
  and commented on; a listing that collects enough reports is automatically
  pulled from the map and the owner is notified why.
- **Spot a To-Let, gamified** — photograph a to-let board you pass, pin its
  location, and climb a public leaderboard (under a nickname, not your real
  name) as you spot more. Board pins render in their own orange layer that
  reveals once you've zoomed in past the district overview (nearby ones group
  into a cluster), and tapping one opens the board photo full-width. Anyone
  can flag a board as gone or wrong — three reports and the pin comes off the
  map automatically, though the row is kept for moderation review.
- **Anonymous rent-transparency pins** — drop a pin showing what you actually
  pay (rent, BHK, gated/not, and optionally furnishing and parking), with no
  name or contact info attached. **Note:** this data is currently write-only —
  it's collected and stored, but nothing in the app displays it back yet. That's
  a known, honest gap, not a hidden one.

## Tech Stack

- **Client:** React 18, Vite, Tailwind CSS, react-leaflet
- **Server:** Express, `pg` (raw SQL, no ORM), JWT
- **Database:** PostgreSQL

Two npm workspaces (`client`, `server`), orchestrated from the root.

See [STRUCTURE.md](./STRUCTURE.md) for the full architecture — every route,
component, database column, and business rule, verified against the actual
code.

## Getting Started

### Prerequisites

- Node.js (this project uses ES modules and modern Node APIs — 18+ recommended)
- PostgreSQL, running locally or reachable via a connection string

### Setup

1. **Clone the repo and install dependencies** (the root workspace installs
   both `client` and `server`):

   ```sh
   git clone <this-repo-url>
   cd chitwan-rent
   npm install
   ```

2. **Create the database:**

   ```sh
   createdb -U postgres chitwan_rent
   ```

3. **Configure environment variables** — copy `server/.env.example` to
   `server/.env` and fill it in:

   | Variable | Required? | What it's for |
   |---|---|---|
   | `PORT` | Optional (defaults to `4000`) | API server port |
   | `DATABASE_URL` | **Required** | PostgreSQL connection string |
   | `JWT_SECRET` | **Required** for real use (has an insecure dev default) | Signs the dummy-auth JWT |
   | `CLIENT_ORIGIN` | Optional | Locks CORS to one exact origin; any `http://localhost:<port>` is trusted if unset |
   | `SERVER_BASE_URL` | Optional (defaults to `http://localhost:$PORT`) | Base URL used to build links inside emails |
   | `SENDGRID_API_KEY` | Required for email to send | [SendGrid](https://app.sendgrid.com/settings/api_keys) API key, used to send verification/digest/notification emails. Sends from `chitwanrent@gmail.com`, verified as a SendGrid **Single Sender** (one address, not a full domain) |
   | `DIGEST_REPLY_TO` | Optional | Reply-To address on weekly digest emails |
   | `DASHBOARD_PASSWORD` | Required only for the internal operator dashboard | Shared password gating that one internal-only tool |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Required for To-Let board photo uploads | [Cloudinary](https://cloudinary.com) credentials (free tier). To-Let board photos upload here rather than being stored in the database — see [STRUCTURE.md](./STRUCTURE.md)'s "To-Let spot photo storage". Server-side only, never sent to the client |

   The client has its own `client/.env.example`, but both of its variables are
   optional: `VITE_API_URL` already defaults to `http://localhost:4000/api`, and
   `CARTO_API_KEY` (a free, per-domain [CARTO basemaps
   key](https://carto.com/basemaps/apikey/), appended to the map tile URLs)
   simply leaves the tiles unkeyed if unset. You only need a `client/.env` to
   point the client elsewhere or to key the basemap.

4. **Apply the base schema, then every migration** — one command:

   ```sh
   npm run db:migrate
   ```

   `schema.sql` alone is stale and does not produce the current database
   shape; every `add-*.js` migration has to run after it, in the exact order
   they were originally added, to reach it. `db:migrate`
   (`server/db/migrate-all.js`) runs `db:schema` followed by all of them in
   that verified order, so the sequence lives in one place instead of being
   copy-pasted correctly by hand. Each migration is still individually
   runnable (`node db/<file>.js`) if you ever need just one.

   > Adding a new migration? Append it to `MIGRATIONS` in
   > `server/db/migrate-all.js` too, or a from-scratch setup will silently
   > skip it.

5. **Seed dummy data** (users, flats, seeker pins, to-let spots, bus routes,
   POIs, rent reports) — must run *after* the migrations above, since the seed
   script writes into columns some of them add:

   ```sh
   npm run db:seed
   ```

6. **Run both client and server in dev mode:**

   ```sh
   npm run dev
   ```

   - API: http://localhost:4000 (health check at `/api/health`)
   - Client: http://localhost:5173

   Re-running `npm run db:seed` truncates and re-seeds every table (including
   `users`), so any accounts created via sign-in during testing are wiped along
   with it — expected for a dev/demo dataset.

## Built with AI assistance

Built with significant help from Claude (Anthropic) throughout development.

## License

No license has been set for this project yet.
