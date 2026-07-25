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

// Pulls every real school/college OSM has tagged inside the Chitwan bbox via
// the public Overpass API. `way` results (buildings/grounds mapped as an
// area rather than a point) are resolved to a single lat/lng via `out
// center`, matching `node` results' shape.
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

  return data.elements
    .map((el) => {
      const lat = el.type === "node" ? el.lat : el.center?.lat;
      const lng = el.type === "node" ? el.lon : el.center?.lon;
      if (lat == null || lng == null) return null;
      const category = el.tags?.amenity === "college" ? "college" : "school";
      const name = el.tags?.name || (category === "college" ? "Unnamed College" : "Unnamed School");
      return { name, category, lat, lng };
    })
    .filter(Boolean);
}
