import { findNearest } from "./geo.js";

function nearestAreaName(lat, lng, areas) {
  if (!areas.length) return "Chitwan";
  return findNearest(lat, lng, areas).point.area;
}

// Reverse-geocodes a dropped pin into a ward/tole name. Tries Nominatim first
// (short timeout since it's a best-effort dev/demo call), falls back to the
// nearest seeded area centroid so the flow never blocks on the network.
export async function reverseGeocodeArea(lat, lng, localAreas = []) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("zoom", "16");

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const name =
        addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.county;
      if (name) return name;
    }
  } catch {
    // network/timeout — fall through to local fallback
  }
  return nearestAreaName(lat, lng, localAreas);
}
