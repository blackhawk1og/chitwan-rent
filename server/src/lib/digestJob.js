import { query } from "../db.js";
import { haversineDistanceMeters } from "./geo.js";
import { sendFlatMatchDigest, sendSeekerMatchDigest } from "./email.js";

const MATCH_RADIUS_METERS = 2000;

// Top N by distance per digest — a dense pocket of listings could otherwise
// produce an unbounded email. 50 is generous for how small this dataset
// currently is while still capping the worst case.
const DIGEST_MATCH_CAP = 50;

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

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

// A flat and a seeker pin only pair up within the same "shape" of listing —
// flats.listing_type ('flat'|'flatmate') and seeker_pins.looking_for
// ('whole_flat'|'room') are independently named but describe the same axis,
// so this is the join key between them. Assumption: a whole-flat listing
// only ever matches a whole-flat seeker, and a flatmate/room listing only
// ever matches a room seeker — there's no cross-pairing (see this feature's
// assumptions writeup).
function isRoomType(flat, seeker) {
  return flat.listing_type === "flatmate" && seeker.looking_for === "room";
}
function isWholeFlatType(flat, seeker) {
  return flat.listing_type !== "flatmate" && seeker.looking_for === "whole_flat";
}

// Gender is the one dimension with a real identity field to check against:
// flats.flatmate_gender_pref (what gender the listing wants) is compared to
// seeker_pins.gender (who the seeker actually is) — not seeker_pins.
// flatmate_gender_pref, which is the seeker's own preference for *their*
// future flatmates and has no flats-side equivalent to compare against
// (flats stores no "current occupants' gender"). Only checked for room-type
// pairs — a whole-flat rental has no shared living space, so gender/food/
// smoking compatibility doesn't apply to it.
function isCompatible(flat, seeker) {
  // Never match a user against their own listing/pin — compared by user id
  // (flats.owner_id vs seeker_pins.user_id), the reliable identity, not
  // email/phone strings, since either could theoretically resolve to the
  // same person through a different field. Both can be null (e.g. no
  // owner_id join match), in which case they're never treated as equal.
  if (flat.owner_id != null && flat.owner_id === seeker.user_id) return false;
  if (!isRoomType(flat, seeker) && !isWholeFlatType(flat, seeker)) return false;
  if (seeker.bhk_pref && seeker.bhk_pref !== "any" && Number(seeker.bhk_pref) !== flat.bhk) return false;
  // "Budget ranges overlap" doesn't literally apply — both flats.rent and
  // seeker_pins.budget are single values, not ranges — so this is read as
  // "the seeker's budget covers this flat's rent."
  if (seeker.budget != null && flat.rent != null && Number(seeker.budget) < Number(flat.rent)) return false;
  if (isRoomType(flat, seeker)) {
    if (!prefCompatible(flat.flatmate_gender_pref, seeker.gender)) return false;
    if (!prefCompatible(flat.food_pref, seeker.food_pref)) return false;
    if (!prefCompatible(flat.smoker_ok, seeker.smoker_ok)) return false;
  }
  return true;
}

// matches used to be a one-time "already emailed this pair" dedup for the
// old instant-match job; this digest job recomputes the full compatible
// list from scratch every run and never gates a send on this table, so it's
// repurposed as a lightweight "last seen compatible" analytics log instead
// (see db/add-digest-unsubscribe.js). Never allowed to break the job over a
// logging failure.
async function logMatchSeen(flatId, seekerPinId) {
  try {
    await query(
      `INSERT INTO matches (flat_id, seeker_pin_id, matched_at) VALUES ($1, $2, now())
       ON CONFLICT (flat_id, seeker_pin_id) DO UPDATE SET matched_at = now()`,
      [flatId, seekerPinId]
    );
  } catch (err) {
    console.error(`Match analytics log failed: flat ${flatId} <-> seeker pin ${seekerPinId}`, err.message);
  }
}

// Only status='available', non-seed flats participate — a deleted flat
// (delete-flat feature or /unsubscribe) or a never-verified, expired
// listing (cleanupExpiredListings) is simply gone from `flats` by the time
// this runs. seeker_pins has no status/verification/expiry concept at all
// (confirmed against schema.sql and routes/seekerPins.js) — a pin is
// "active" for as long as its row exists, full stop; is_seed=false is the
// only filter needed on that side. is_seed=false on both sides keeps
// seed.js's dummy data (fake emails, fake phone numbers) out of every
// digest.
const ACTIVE_FLATS_SQL = `
  SELECT f.*, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
  FROM flats f
  LEFT JOIN users u ON u.id = f.owner_id
  WHERE f.status = 'available' AND f.is_seed = false
`;
const ACTIVE_SEEKERS_SQL = `
  SELECT sp.*, u.name AS seeker_name
  FROM seeker_pins sp
  LEFT JOIN users u ON u.id = sp.user_id
  WHERE sp.is_seed = false
`;

function findCompatible(subject, pool, subjectIsFlat) {
  if (subject.lat == null || subject.lng == null) return [];
  const out = [];
  for (const candidate of pool) {
    if (candidate.lat == null || candidate.lng == null) continue;
    const distance = haversineDistanceMeters(subject.lat, subject.lng, candidate.lat, candidate.lng);
    if (distance > MATCH_RADIUS_METERS) continue;
    const [flat, seeker] = subjectIsFlat ? [subject, candidate] : [candidate, subject];
    if (!isCompatible(flat, seeker)) continue;
    out.push(subjectIsFlat ? { seeker: candidate, distance } : { flat: candidate, distance });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out;
}

// Each run finds whichever flats/seeker pins are individually due
// (next_digest_at <= now — see db/add-next-digest-at.js, set to 12h after
// verification/creation and pushed 7 days on every send) and computes their
// matches against the FULL active pool on the other side, not just other
// due rows — a flat due today should still see a seeker pin that became
// active yesterday and isn't due again for days. Due-ness is checked in SQL
// (not by pulling everything and filtering in JS) so it can't drift from
// the DB's own clock.
export async function runDigestJob() {
  const dueFlatsResult = await query(`${ACTIVE_FLATS_SQL} AND f.next_digest_at <= now()`);
  const dueSeekersResult = await query(`${ACTIVE_SEEKERS_SQL} AND sp.next_digest_at <= now()`);
  const allSeekersResult = await query(ACTIVE_SEEKERS_SQL);
  const allFlatsResult = await query(ACTIVE_FLATS_SQL);

  const dueFlats = dueFlatsResult.rows;
  const dueSeekers = dueSeekersResult.rows;
  const allSeekers = allSeekersResult.rows;
  const allFlats = allFlatsResult.rows;

  let flatDigestsSent = 0;
  let flatDigestsSkipped = 0;

  for (const flat of dueFlats) {
    const matches = findCompatible(flat, allSeekers, true);
    const capped = matches.slice(0, DIGEST_MATCH_CAP);
    for (const { seeker } of matches) await logMatchSeen(flat.id, seeker.id);

    // A due listing with zero current matches still gets skipped-not-sent
    // (no point emailing "we found nobody" every time it comes due) but its
    // next_digest_at is ALWAYS advanced regardless, in the same statement,
    // so a match-less listing is checked again in exactly 7 days — not
    // re-evaluated every hour forever. See this feature's assumptions
    // writeup for this choice.
    if (capped.length > 0 && flat.owner_email) {
      try {
        await sendFlatMatchDigest({
          to: flat.owner_email,
          ownerName: flat.owner_name,
          flat,
          matches: capped,
          unsubscribeUrl: `${SERVER_BASE_URL}/unsubscribe?token=${flat.unsubscribe_token}`,
        });
        flatDigestsSent++;
        console.log(`Flat digest sent: flat ${flat.id} (${capped.length} of ${matches.length} matches)`);
      } catch (err) {
        console.error(`Flat digest failed: flat ${flat.id}`, err.message);
      }
    } else {
      flatDigestsSkipped++;
      console.log(`Flat digest skipped (no matches yet): flat ${flat.id}`);
    }

    try {
      await query(`UPDATE flats SET next_digest_at = now() + interval '7 days' WHERE id = $1`, [flat.id]);
    } catch (err) {
      console.error(`Failed to reschedule next_digest_at: flat ${flat.id}`, err.message);
    }
  }

  let seekerDigestsSent = 0;
  let seekerDigestsSkipped = 0;

  for (const seeker of dueSeekers) {
    const matches = findCompatible(seeker, allFlats, false);
    const capped = matches.slice(0, DIGEST_MATCH_CAP);
    for (const { flat } of matches) await logMatchSeen(flat.id, seeker.id);

    if (capped.length > 0 && seeker.email) {
      try {
        await sendSeekerMatchDigest({
          to: seeker.email,
          seekerName: seeker.seeker_name,
          seeker,
          matches: capped,
          unsubscribeUrl: `${SERVER_BASE_URL}/unsubscribe?token=${seeker.unsubscribe_token}`,
        });
        seekerDigestsSent++;
        console.log(`Seeker digest sent: seeker pin ${seeker.id} (${capped.length} of ${matches.length} matches)`);
      } catch (err) {
        console.error(`Seeker digest failed: seeker pin ${seeker.id}`, err.message);
      }
    } else {
      seekerDigestsSkipped++;
      console.log(`Seeker digest skipped (no matches yet): seeker pin ${seeker.id}`);
    }

    try {
      await query(`UPDATE seeker_pins SET next_digest_at = now() + interval '7 days' WHERE id = $1`, [seeker.id]);
    } catch (err) {
      console.error(`Failed to reschedule next_digest_at: seeker pin ${seeker.id}`, err.message);
    }
  }

  return { flatDigestsSent, flatDigestsSkipped, seekerDigestsSent, seekerDigestsSkipped };
}

// Hourly due-check, following cleanupExpiredListings.js's exact pattern —
// frequent enough that a listing due at, say, 9:03am isn't kept waiting
// long past that, without re-scanning on every request. Each individual
// flat/seeker pin's own actual cadence is still 12h-then-7-days, driven by
// next_digest_at, not by this constant.
const DIGEST_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function runAndLogErrors() {
  runDigestJob().catch((err) => console.error("Digest job failed:", err));
}

export function startDigestJob() {
  runAndLogErrors();
  return setInterval(runAndLogErrors, DIGEST_CHECK_INTERVAL_MS);
}
