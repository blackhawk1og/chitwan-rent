import { query } from "../db.js";
import { haversineDistanceMeters } from "./geo.js";
import { sendMatchEmail } from "./email.js";

const MATCH_RADIUS_METERS = 2000;

// Both sides store a *preference* for these three dimensions, not an
// identity — "Food preference in flatmate" and "Okay with a flatmate who
// smokes?" are the literal labels on both ListFlatDetailsForm and
// DropSeekerPinForm (see client/src/components/*.jsx). null/undefined/"any"
// all mean "no preference stated," compatible with anything on that axis.
function normalizePref(value) {
  return value == null || value === "any" ? null : value;
}

function prefCompatible(a, b) {
  const na = normalizePref(a);
  const nb = normalizePref(b);
  return na === null || nb === null || na === nb;
}

// Room-type listings only (flats.listing_type = 'flatmate', seeker_pins.
// looking_for = 'room') — a whole-flat rental has no shared living space,
// so gender/food/smoking compatibility doesn't apply to it (see Step 0 of
// this feature's spec).
//
// Gender is the one dimension with a real identity field to check against:
// flats.flatmate_gender_pref (what gender the listing wants) is compared to
// seeker_pins.gender (who the seeker actually is) — not to seeker_pins.
// flatmate_gender_pref, which is the seeker's own preference for *their*
// future flatmates and has no corresponding field on the flats side to
// compare against (flats stores no "current occupants' gender"). See this
// feature's assumptions writeup for the full reasoning.
function isCompatible(flat, seeker) {
  if (seeker.bhk_pref && seeker.bhk_pref !== "any" && Number(seeker.bhk_pref) !== flat.bhk) return false;
  if (seeker.budget != null && flat.rent != null && Number(seeker.budget) < Number(flat.rent)) return false;
  if (!prefCompatible(flat.flatmate_gender_pref, seeker.gender)) return false;
  if (!prefCompatible(flat.food_pref, seeker.food_pref)) return false;
  if (!prefCompatible(flat.smoker_ok, seeker.smoker_ok)) return false;
  return true;
}

// Only status='available' flats and seeker_pins currently in the table
// participate — a deleted flat (delete-flat feature) or an expired,
// never-verified listing (cleanupExpiredListings) is simply gone from
// `flats` by the time this query runs, so it can never produce a new match;
// same logic covers seeker_pins if a delete mechanism is ever added for
// those (none exists yet — see this feature's assumptions writeup).
// is_seed=false on both sides keeps seed.js's dummy data (fake emails,
// fake phone numbers) from ever being matched or emailed.
export async function runMatchingJob() {
  const flatsResult = await query(
    `SELECT f.*, u.email AS owner_email, u.phone AS owner_phone, u.name AS owner_name
     FROM flats f
     LEFT JOIN users u ON u.id = f.owner_id
     WHERE f.status = 'available' AND f.listing_type = 'flatmate' AND f.is_seed = false`
  );
  const seekersResult = await query(
    `SELECT sp.*, u.name AS seeker_name
     FROM seeker_pins sp
     LEFT JOIN users u ON u.id = sp.user_id
     WHERE sp.looking_for = 'room' AND sp.is_seed = false`
  );

  let newMatches = 0;

  for (const flat of flatsResult.rows) {
    if (flat.lat == null || flat.lng == null) continue;

    for (const seeker of seekersResult.rows) {
      if (seeker.lat == null || seeker.lng == null) continue;
      if (haversineDistanceMeters(flat.lat, flat.lng, seeker.lat, seeker.lng) > MATCH_RADIUS_METERS) continue;
      if (!isCompatible(flat, seeker)) continue;

      // Atomic insert-if-new, same race-safety reasoning as
      // verifyListingByToken's UPDATE...RETURNING — two overlapping job
      // runs can't both send emails for the same pair, since only one
      // INSERT can win the UNIQUE(flat_id, seeker_pin_id) constraint.
      let inserted;
      try {
        inserted = await query(
          `INSERT INTO matches (flat_id, seeker_pin_id) VALUES ($1, $2)
           ON CONFLICT (flat_id, seeker_pin_id) DO NOTHING
           RETURNING id`,
          [flat.id, seeker.id]
        );
      } catch (err) {
        console.error(`Match insert failed: flat ${flat.id} <-> seeker pin ${seeker.id}`, err.message);
        continue;
      }
      if (inserted.rows.length === 0) continue; // already matched on a previous run

      newMatches++;
      console.log(`New match: flat ${flat.id} <-> seeker pin ${seeker.id}`);

      if (flat.owner_email) {
        try {
          await sendMatchEmail({
            to: flat.owner_email,
            matchName: seeker.seeker_name,
            matchEmail: seeker.email,
            matchPhone: seeker.phone,
            listingType: "flatmate",
          });
          console.log(`Match email sent: flat ${flat.id} owner`);
        } catch (err) {
          console.error(`Match email failed: flat ${flat.id} owner`, err.message);
        }
      }

      if (seeker.email) {
        try {
          await sendMatchEmail({
            to: seeker.email,
            matchName: flat.owner_name,
            matchEmail: flat.owner_email,
            matchPhone: flat.owner_phone,
            listingType: "flatmate",
          });
          console.log(`Match email sent: seeker pin ${seeker.id}`);
        } catch (err) {
          console.error(`Match email failed: seeker pin ${seeker.id}`, err.message);
        }
      }
    }
  }

  return newMatches;
}

// 20 minutes: frequent enough that a new listing or pin surfaces a match
// reasonably promptly (this is the *only* way matched users get connected —
// no in-app messaging), without re-scanning every active flat x seeker pin
// pair so often that it wastes DB/mail-sending work for what's still a
// low-volume, non-realtime feature. Tighter than the hourly expired-listing
// cleanup on purpose: a delayed match is a worse experience than a delayed
// cleanup sweep.
const MATCH_INTERVAL_MS = 20 * 60 * 1000;

function runAndLogErrors() {
  runMatchingJob().catch((err) => console.error("Matching job failed:", err));
}

// Same start-function shape as startExpiredListingsCleanup — runs once
// immediately, then on the interval.
export function startMatchingJob() {
  runAndLogErrors();
  return setInterval(runAndLogErrors, MATCH_INTERVAL_MS);
}
