import { pool } from "../src/db.js";

// --- Chitwan areas with rough centers + density weight (higher = more listings) ---
// Coordinates are approximate (dummy demo data), clustered around real Chitwan wards/municipalities.
const AREAS = [
  { name: "Bharatpur-10", lat: 27.6633, lng: 84.4327, weight: 14 }, // Narayangarh / Bus Park — dense core
  { name: "Bharatpur-5", lat: 27.6469, lng: 84.4055, weight: 12 }, // Pulchowk
  { name: "Bharatpur-11", lat: 27.6395, lng: 84.4172, weight: 12 }, // Hospital Chowk
  { name: "Bharatpur-14", lat: 27.628, lng: 84.445, weight: 10 }, // Jugedi border
  { name: "Ratnanagar", lat: 27.582, lng: 84.485, weight: 6 },
  { name: "Khairahani", lat: 27.61, lng: 84.34, weight: 6 },
  { name: "Jutpani", lat: 27.67, lng: 84.455, weight: 4 },
  { name: "Gitanagar", lat: 27.69, lng: 84.38, weight: 4 },
  { name: "Bagauda", lat: 27.695, lng: 84.45, weight: 3 },
  { name: "Kalika", lat: 27.56, lng: 84.25, weight: 2 },
  { name: "Rapti", lat: 27.63, lng: 84.28, weight: 2 },
  { name: "Shaktikhor", lat: 27.72, lng: 84.2, weight: 1 },
  { name: "Ichchhakamana", lat: 27.65, lng: 84.15, weight: 1 },
];

const TOTAL_WEIGHT = AREAS.reduce((s, a) => s + a.weight, 0);

function pickArea() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const area of AREAS) {
    if (r < area.weight) return area;
    r -= area.weight;
  }
  return AREAS[0];
}

function jitter(value, spreadDeg) {
  return value + (Math.random() - 0.5) * spreadDeg;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRating() {
  return Number((3.5 + Math.random() * 1.5).toFixed(1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// BHK distribution weighted toward smaller units, and rent bands per Phase 0 spec.
const BHK_WEIGHTS = [
  { bhk: 1, weight: 30, rentMin: 5000, rentMax: 13000, sqftMin: 250, sqftMax: 450 },
  { bhk: 2, weight: 32, rentMin: 8000, rentMax: 20000, sqftMin: 450, sqftMax: 750 },
  { bhk: 3, weight: 22, rentMin: 15000, rentMax: 35000, sqftMin: 700, sqftMax: 1100 },
  { bhk: 4, weight: 11, rentMin: 25000, rentMax: 50000, sqftMin: 1000, sqftMax: 1500 },
  { bhk: 5, weight: 5, rentMin: 40000, rentMax: 90000, sqftMin: 1400, sqftMax: 2500 },
];
const BHK_TOTAL_WEIGHT = BHK_WEIGHTS.reduce((s, b) => s + b.weight, 0);

function pickBhkBand() {
  let r = Math.random() * BHK_TOTAL_WEIGHT;
  for (const band of BHK_WEIGHTS) {
    if (r < band.weight) return band;
    r -= band.weight;
  }
  return BHK_WEIGHTS[0];
}

const ONE_LINERS = [
  "Great locality, calm neighbourhood",
  "Walking distance to Bus Park",
  "Quiet tole, good for families",
  "Close to Bharatpur Hospital",
  "Near CMC college, ideal for students",
  "Newly painted, ready to move in",
  "Water supply is 24/7, no tanker needed",
  "Landlord stays in same building, very responsive",
  "Backup inverter included",
  "Close to Narayani riverside",
  "Peaceful area, away from highway noise",
  "5 min walk to local market",
  "Sunny balcony, good airflow",
  "Newly built, first tenant",
  "Close to Ratna Rajmarg junction",
];

const FIRST_NAMES = [
  "Sujan", "Anita", "Bikash", "Sabina", "Rajan", "Pooja", "Nabin", "Kritika",
  "Suman", "Ranjita", "Dipesh", "Manisha", "Prakash", "Sarita", "Bishal",
  "Anjali", "Rohit", "Sunita", "Kamal", "Rekha",
];
const LAST_NAMES = [
  "Chaudhary", "Gurung", "Tamang", "Shrestha", "Poudel", "Adhikari", "Thapa",
  "Rai", "Magar", "Koirala", "Basnet", "Karki", "Bhattarai", "Ghimire",
];

function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomPhone() {
  return `98${randInt(10000000, 59999999)}`;
}

async function seedUsers() {
  // 10 dummy users; hero_points distribution echoes a "20 / 3 / 2 / 1 / 1 / 0..." leaderboard shape.
  const heroPointsShape = [20, 3, 2, 1, 1, 0, 0, 0, 0, 0];
  const users = [];
  for (let i = 0; i < 10; i++) {
    const name = randomName();
    const heroPoints = heroPointsShape[i];
    const res = await pool.query(
      `INSERT INTO users (name, phone, email, role, hero_points)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        name,
        randomPhone(),
        `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        heroPoints > 0 ? "superhero" : "user",
        heroPoints,
      ]
    );
    users.push({ id: res.rows[0].id, name, heroPoints });
  }
  return users;
}

async function seedFlats(users, count = 180) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const area = pickArea();
    const band = pickBhkBand();
    const lat = jitter(area.lat, 0.02);
    const lng = jitter(area.lng, 0.02);
    const rent = randInt(band.rentMin, band.rentMax);
    const owner = pick(users);
    const statusRoll = Math.random();
    const status = statusRoll < 0.82 ? "available" : statusRoll < 0.94 ? "rented" : "pending_review";

    rows.push([
      owner.id,
      "flat",
      band.bhk,
      rent,
      Math.random() < 0.85 ? rent * randInt(1, 3) : null, // deposit, optional
      pick(["furnished", "unfurnished"]),
      Math.random() < 0.4,
      Math.random() < 0.3 ? "gated" : "not_gated",
      Math.random() < 0.7 ? pick(["family", "bachelor"]) : null,
      Math.random() < 0.7 ? pick(["yes", "no", "not_sure"]) : null,
      randInt(0, 3),
      randInt(band.sqftMin, band.sqftMax),
      randomRating(),
      Math.random() < 0.8 ? pick(ONE_LINERS) : null,
      status,
      lat,
      lng,
      area.name,
      [],
      daysAgo(randInt(0, 180)),
    ]);
  }

  for (const r of rows) {
    await pool.query(
      `INSERT INTO flats
        (owner_id, listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
         gated, who_lives, pets_allowed, parking_for, sqft, rating, one_liner, status,
         lat, lng, area, photos, posted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      r
    );
  }
  return rows.length;
}

async function seedSeekerPins(users, count = 40) {
  const lifestyleNotes = [
    "Early sleeper, WFH on weekdays, no pets",
    "Student at CTEVT, mostly out during the day",
    "Cooks daily, prefers a clean kitchen setup",
    "Works night shift at hospital, needs quiet mornings",
    "Non-smoker, occasional weekend guests",
    "WFH full time, needs decent wifi/backup power",
  ];
  for (let i = 0; i < count; i++) {
    const area = pickArea();
    const lat = jitter(area.lat, 0.02);
    const lng = jitter(area.lng, 0.02);
    const user = pick(users);
    await pool.query(
      `INSERT INTO seeker_pins
        (user_id, looking_for, budget, bhk_pref, move_in, food_pref, smoker_ok,
         gender, flatmate_gender_pref, parking_required, lifestyle_note, email, phone,
         lat, lng, area, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        user.id,
        pick(["whole_flat", "room"]),
        randInt(4000, 25000),
        pick(["1", "2", "3", "any"]),
        pick(["asap", "next_month", "flexible"]),
        pick(["veg", "non_veg", "any"]),
        pick(["smoker", "non_smoker"]),
        pick(["male", "female", "other"]),
        pick(["male", "female", "any"]),
        Math.random() < 0.4,
        Math.random() < 0.6 ? pick(lifestyleNotes) : null,
        `${user.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        randomPhone(),
        lat,
        lng,
        area.name,
        daysAgo(randInt(0, 90)),
      ]
    );
  }
  return count;
}

async function seedToletSpots(users) {
  // Distribution echoes the "20 / 3 / 2 / 1 / 1" superhero leaderboard shape (sums to 27, seed target ~25-27).
  const spotCounts = [20, 3, 2, 1, 1, 0, 0, 0, 0, 0];
  const messages = [
    "Fresh board near the market, looked well-kept",
    "Spotted on my way to work, seemed like a good deal",
    "Landlord was right there, friendly guy",
    "Board was a bit faded but still readable",
    "New building, board just went up this week",
  ];
  let total = 0;
  for (let u = 0; u < users.length; u++) {
    const n = spotCounts[u];
    for (let i = 0; i < n; i++) {
      const area = pickArea();
      await pool.query(
        `INSERT INTO tolet_spots (spotter_id, photo_url, name, message, lat, lng, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          users[u].id,
          `/uploads/tolet-placeholder-${randInt(1, 6)}.jpg`,
          Math.random() < 0.85 ? users[u].name : null,
          Math.random() < 0.5 ? pick(messages) : null,
          jitter(area.lat, 0.02),
          jitter(area.lng, 0.02),
          daysAgo(randInt(0, 120)),
        ]
      );
      total++;
    }
  }
  return total;
}

async function seedBusRoutes() {
  // Approximate local road corridors, not exact GPS-surveyed routes.
  const routes = [
    {
      name: "Route 1: Bus Park - Pulchowk",
      color: "#22c55e",
      coords: [[84.4327, 27.6633], [84.42, 27.655], [84.4055, 27.6469]],
    },
    {
      name: "Route 2: Hospital Chowk - Jugedi",
      color: "#ec4899",
      coords: [[84.4172, 27.6395], [84.43, 27.633], [84.445, 27.628]],
    },
    {
      name: "Route 3: Narayangarh - Ratnanagar",
      color: "#8b5cf6",
      coords: [[84.4327, 27.6633], [84.46, 27.62], [84.485, 27.582]],
    },
    {
      name: "Route 4: Bharatpur-5 - Khairahani",
      color: "#f59e0b",
      coords: [[84.4055, 27.6469], [84.37, 27.62], [84.34, 27.61]],
    },
    {
      name: "Route 5: Bus Park - Gitanagar",
      color: "#14b8a6",
      coords: [[84.4327, 27.6633], [84.4, 27.68], [84.38, 27.69]],
    },
    {
      name: "Route 6: Bagauda - Jutpani",
      color: "#3b82f6",
      coords: [[84.45, 27.695], [84.453, 27.68], [84.455, 27.67]],
    },
    {
      name: "Route 7: Pulchowk - Rapti Bridge",
      color: "#22c55e",
      coords: [[84.4055, 27.6469], [84.35, 27.635], [84.28, 27.63]],
    },
    {
      name: "Route 8: Hospital Chowk - Kalika",
      color: "#ec4899",
      coords: [[84.4172, 27.6395], [84.3, 27.58], [84.25, 27.56]],
    },
    {
      name: "Route 9: Bus Park - Shaktikhor",
      color: "#8b5cf6",
      coords: [[84.4327, 27.6633], [84.32, 27.68], [84.2, 27.72]],
    },
    {
      name: "Route 10: Bharatpur-14 - Ichchhakamana",
      color: "#f59e0b",
      coords: [[84.445, 27.628], [84.3, 27.64], [84.15, 27.65]],
    },
  ];
  for (const r of routes) {
    await pool.query(
      `INSERT INTO bus_routes (name, color, geojson) VALUES ($1,$2,$3)`,
      [
        r.name,
        r.color,
        JSON.stringify({
          type: "Feature",
          properties: { name: r.name, color: r.color },
          geometry: { type: "LineString", coordinates: r.coords },
        }),
      ]
    );
  }
  return routes.length;
}

async function seedPois() {
  const pois = [
    { name: "Bharatpur Hospital", category: "hospital" },
    { name: "College of Medical Sciences (CMC)", category: "college" },
    { name: "Narayani Secondary School", category: "school" },
    { name: "Amrit Science Campus, Chitwan", category: "college" },
    { name: "Bal Kumari Higher Secondary School", category: "school" },
    { name: "Bharatpur Cancer Hospital", category: "hospital" },
    { name: "Chitwan Medical College", category: "college" },
    { name: "Bishwa Adarsha Higher Secondary School", category: "school" },
    { name: "Narayangarh Bus Park", category: "landmark" },
    { name: "Bharatpur Buddha Chowk", category: "landmark" },
    { name: "Devghat Temple", category: "temple" },
    { name: "Bal Mandir School", category: "school" },
    { name: "Rapti Model Higher Secondary School", category: "school" },
    { name: "National Trauma Center Chitwan", category: "hospital" },
    { name: "Gauri Shankar Temple", category: "temple" },
    { name: "Birendranagar Higher Secondary School", category: "school" },
    { name: "Sauraha Chitwan National Park Gate", category: "landmark" },
    { name: "Ratnanagar Municipality Office", category: "landmark" },
    { name: "Khairahani Hospital", category: "hospital" },
    { name: "Manakamana Boarding School", category: "school" },
    { name: "Xavier International College", category: "college" },
    { name: "Bhagwati Temple, Bharatpur", category: "temple" },
    { name: "Green Valley College", category: "college" },
    { name: "Narayani Riverside Park", category: "landmark" },
    { name: "Kalika Health Post", category: "hospital" },
  ];
  for (const p of pois) {
    const area = pickArea();
    await pool.query(
      `INSERT INTO pois (name, category, lat, lng) VALUES ($1,$2,$3,$4)`,
      [p.name, p.category, jitter(area.lat, 0.015), jitter(area.lng, 0.015)]
    );
  }
  return pois.length;
}

async function main() {
  console.log("Seeding database...");

  await pool.query(
    "TRUNCATE tolet_spots, seeker_pins, flats, bus_routes, pois, users RESTART IDENTITY CASCADE"
  );

  const users = await seedUsers();
  console.log(`Seeded ${users.length} users.`);

  const flatCount = await seedFlats(users, 180);
  console.log(`Seeded ${flatCount} flats.`);

  const seekerCount = await seedSeekerPins(users, 40);
  console.log(`Seeded ${seekerCount} seeker pins.`);

  const toletCount = await seedToletSpots(users);
  console.log(`Seeded ${toletCount} to-let spots.`);

  const routeCount = await seedBusRoutes();
  console.log(`Seeded ${routeCount} bus routes.`);

  const poiCount = await seedPois();
  console.log(`Seeded ${poiCount} POIs.`);

  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
