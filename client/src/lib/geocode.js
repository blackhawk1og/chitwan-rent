function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestAreaName(lat, lng, areas) {
  if (!areas.length) return "Chitwan";
  let closest = areas[0];
  let closestDist = Infinity;
  for (const a of areas) {
    const dist = haversineMeters(lat, lng, Number(a.lat), Number(a.lng));
    if (dist < closestDist) {
      closestDist = dist;
      closest = a;
    }
  }
  return closest.area;
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
