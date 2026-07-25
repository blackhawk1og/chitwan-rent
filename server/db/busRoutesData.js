// Bus route waypoints + real-road snapping via OSRM's public routing API.
// Shared by the full seed (npm run db:seed) and the standalone bus-routes-only
// regeneration script (npm run seed:bus-routes) so both produce identical
// road-following geometry instead of the old straight-line-between-points
// version that cut diagonally across terrain/water.
//
// Waypoints are [lng, lat] triples along real Chitwan road corridors,
// reusing the same area anchor points as the rest of the seed data so the
// route endpoints line up with named localities on the map.
export const BUS_ROUTES = [
  {
    name: "Route 1: Bus Park - Pulchowk",
    color: "#22c55e",
    waypoints: [
      [84.4327, 27.6633], // Narayangarh Bus Park
      [84.42, 27.655],
      [84.4055, 27.6469], // Pulchowk
    ],
  },
  {
    name: "Route 2: Hospital Chowk - Jugedi",
    color: "#ec4899",
    waypoints: [
      [84.4172, 27.6395], // Hospital Chowk
      [84.43, 27.633],
      [84.445, 27.628], // Jugedi border
    ],
  },
  {
    name: "Route 3: Narayangarh - Ratnanagar",
    color: "#8b5cf6",
    waypoints: [
      [84.4327, 27.6633], // Narayangarh
      [84.46, 27.62],
      [84.485, 27.582], // Ratnanagar
    ],
  },
  {
    name: "Route 4: Bharatpur-5 - Khairahani",
    color: "#f59e0b",
    waypoints: [
      [84.4055, 27.6469], // Pulchowk / Bharatpur-5
      [84.37, 27.62],
      [84.34, 27.61], // Khairahani
    ],
  },
  {
    name: "Route 5: Bus Park - Gitanagar",
    color: "#14b8a6",
    waypoints: [
      [84.4327, 27.6633], // Narayangarh Bus Park
      [84.4, 27.68],
      [84.38, 27.69], // Gitanagar
    ],
  },
  {
    name: "Route 6: Bagauda - Jutpani",
    color: "#3b82f6",
    waypoints: [
      [84.45, 27.695], // Bagauda
      [84.453, 27.68],
      [84.455, 27.67], // Jutpani
    ],
  },
  {
    name: "Route 7: Pulchowk - Rapti Bridge",
    color: "#22c55e",
    waypoints: [
      [84.4055, 27.6469], // Pulchowk
      [84.35, 27.635],
      [84.28, 27.63], // Rapti Bridge area
    ],
  },
  {
    name: "Route 8: Hospital Chowk - Kalika",
    color: "#ec4899",
    waypoints: [
      [84.4172, 27.6395], // Hospital Chowk
      [84.3, 27.58],
      [84.25, 27.56], // Kalika
    ],
  },
  {
    name: "Route 9: Bus Park - Shaktikhor",
    color: "#8b5cf6",
    waypoints: [
      [84.4327, 27.6633], // Narayangarh Bus Park
      [84.32, 27.68],
      [84.2, 27.72], // Shaktikhor
    ],
  },
  {
    name: "Route 10: Bharatpur-14 - Ichchhakamana",
    color: "#f59e0b",
    waypoints: [
      [84.445, 27.628], // Bharatpur-14 / Jugedi
      [84.3, 27.64],
      [84.15, 27.65], // Ichchhakamana
    ],
  },
];

// Snaps a sequence of [lng, lat] waypoints to real road geometry via OSRM's
// public demo routing server. Returns a GeoJSON LineString geometry.
export async function fetchRoadSnappedGeometry(waypoints) {
  const coordStr = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`OSRM could not find a route (code: ${data.code})`);
  }
  return data.routes[0].geometry;
}
