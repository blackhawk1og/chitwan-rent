import { haversineDistanceMeters } from "../src/lib/geo.js";

// Chitwan district, roughly: Bharatpur / Ratnanagar / Khairahani / Kalika /
// Rapti / Ichchhakamana — same extent as CHITWAN_BOUNDS on the client.
export const CHITWAN_BBOX = { south: 27.45, west: 84.15, north: 27.8, east: 84.65 };

// The shared public Overpass instance is prone to transient 504s/"server too
// busy" errors under load — worth a few retries with backoff before giving up.
const OVERPASS_MAX_ATTEMPTS = 4;
const OVERPASS_RETRY_DELAY_MS = 8000;

async function queryOverpass(query) {
  for (let attempt = 1; attempt <= OVERPASS_MAX_ATTEMPTS; attempt++) {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      // Overpass's Apache front-end 406s requests using Node's default fetch
      // User-Agent (and requests with no Accept header) — both must be set
      // explicitly to look like a normal HTTP client.
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": "chitwan-rent-seed-script/1.0",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (res.ok) return res.json();

    const retriable = res.status === 504 || res.status === 429 || res.status === 503;
    if (!retriable || attempt === OVERPASS_MAX_ATTEMPTS) {
      throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`);
    }
    console.log(`Overpass returned ${res.status}, retrying (${attempt}/${OVERPASS_MAX_ATTEMPTS})...`);
    await new Promise((resolve) => setTimeout(resolve, OVERPASS_RETRY_DELAY_MS));
  }
}

// --- Fuzzy-match dedup for OSM POI pulls ------------------------------------
// OSM frequently has both a `node` and a `way`(center) tagged for the same
// physical place, or plain duplicate entries with inconsistent
// spelling/capitalization/qualifier words. Any POI-fetching function in this
// file should dedupe its results before returning — dedupePois() below is
// generic across categories, not school/college-specific.

const DUPLICATE_DISTANCE_METERS = 400;
const DUPLICATE_NAME_SIMILARITY = 0.85;

// Words too generic to help distinguish one place from another within a
// category — stripped before comparing names so e.g. "X English School" and
// "X School" are compared on their distinguishing part ("X"), not diluted by
// suffix/qualifier words nearly every entry in the category shares.
const GENERIC_NAME_WORDS = new Set([
  "school", "college", "secondary", "higher", "basic", "primary", "campus",
  "academy", "english", "medium", "boarding", "international", "institute",
  "hss", "the", "of", "and", "pvt", "ltd",
]);

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.,'()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Strips trailing city/area qualifiers — "(Chitwan)", ", Narayangarh" — so
// e.g. "Little Flower School" and "Little Flower School, Narayangarh" are
// compared on the institution name itself, not penalized for one entry
// having an appended location tag the other lacks. Only used for the
// similarity check, not for the stored name or the completeness tiebreak.
function stripTrailingQualifiers(name) {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/,.*$/, "")
    .trim();
}

function coreTokens(name) {
  const normalized = normalizeName(stripTrailingQualifiers(name));
  const words = normalized.split(" ").filter(Boolean);
  const core = words.filter((w) => !GENERIC_NAME_WORDS.has(w));
  return core.length ? core : words;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[m][n];
}

// Compares the "core" (generic-word-stripped) form of two names so that
// differences confined to boilerplate suffixes don't drown out the part that
// actually identifies the place, then scores the remainder with Levenshtein
// so small spelling/transliteration differences (e.g. "gyandarshan" vs
// "gyandarsan") still register as a near-match.
function nameSimilarity(nameA, nameB) {
  const a = coreTokens(nameA).join(" ");
  const b = coreTokens(nameB).join(" ");
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

// Same physical place if its OSM entry seems more complete (more words —
// e.g. a full name vs an abbreviated duplicate), then a `way`(center-derived)
// entry over a raw `node` (ways are usually the more precisely mapped
// footprint), then whichever was encountered first.
function pickBetter(a, b) {
  const aWordCount = normalizeName(a.name).split(" ").filter(Boolean).length;
  const bWordCount = normalizeName(b.name).split(" ").filter(Boolean).length;
  if (aWordCount !== bWordCount) return aWordCount > bWordCount ? a : b;
  if (Boolean(a.isWay) !== Boolean(b.isWay)) return a.isWay ? a : b;
  return a;
}

// Generic dedup pass: within each category, any two entries whose names are
// a near-match (>= DUPLICATE_NAME_SIMILARITY) AND that sit within
// DUPLICATE_DISTANCE_METERS of each other are treated as the same physical
// place and collapsed to one entry via pickBetter(). Reusable for any POI
// category pulled from Overpass, not just schools/colleges.
export function dedupePois(pois) {
  const byCategory = new Map();
  for (const p of pois) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category).push(p);
  }

  const kept = [];
  let removedCount = 0;

  for (const group of byCategory.values()) {
    const alive = group.slice();
    const dropped = new Set();

    for (let i = 0; i < alive.length; i++) {
      if (dropped.has(i)) continue;
      for (let j = i + 1; j < alive.length; j++) {
        if (dropped.has(j)) continue;

        const distanceM = haversineDistanceMeters(alive[i].lat, alive[i].lng, alive[j].lat, alive[j].lng);
        if (distanceM > DUPLICATE_DISTANCE_METERS) continue;

        const similarity = nameSimilarity(alive[i].name, alive[j].name);
        if (similarity < DUPLICATE_NAME_SIMILARITY) continue;

        alive[i] = pickBetter(alive[i], alive[j]);
        dropped.add(j);
        removedCount++;
      }
    }

    for (let i = 0; i < alive.length; i++) {
      if (!dropped.has(i)) kept.push(alive[i]);
    }
  }

  return { pois: kept, removedCount };
}

// Pulls every real school/college OSM has tagged inside the Chitwan bbox via
// the public Overpass API. `way` results (buildings/grounds mapped as an
// area rather than a point) are resolved to a single lat/lng via `out
// center`, matching `node` results' shape. Results are deduped before
// returning — see dedupePois() above.
export async function fetchSchoolsAndColleges() {
  const { south, west, north, east } = CHITWAN_BBOX;
  const bbox = `${south},${west},${north},${east}`;
  const query = `
    [out:json][timeout:90];
    (
      node["amenity"="school"](${bbox});
      node["amenity"="college"](${bbox});
      way["amenity"="school"](${bbox});
      way["amenity"="college"](${bbox});
    );
    out center;
  `;

  const data = await queryOverpass(query);

  const rawPois = data.elements
    .map((el) => {
      const lat = el.type === "node" ? el.lat : el.center?.lat;
      const lng = el.type === "node" ? el.lon : el.center?.lon;
      if (lat == null || lng == null) return null;
      // Skip OSM entries with no name tag entirely rather than inserting a
      // placeholder — an unlabeled pin isn't useful and clutters the map.
      const name = el.tags?.name;
      if (!name) return null;
      const category = el.tags?.amenity === "college" ? "college" : "school";
      return { name, category, lat, lng, isWay: el.type === "way" };
    })
    .filter(Boolean);

  const { pois, removedCount } = dedupePois(rawPois);
  console.log(`Removed ${removedCount} duplicate POIs out of ${rawPois.length} fetched.`);

  return pois.map(({ isWay, ...rest }) => rest);
}
