import { queryOverpass, dedupePois, CHITWAN_BBOX } from "./poisData.js";

// The search bar's local typeahead gazetteer — general locality names
// (cities, towns, villages, suburbs, neighbourhoods, hamlets), separate from
// the `pois` table's specific named venues (schools, hospitals, restaurants...).
// 'city' was missing originally — Bharatpur, Chitwan's district headquarters
// and largest urban area, is tagged place=city in OSM (not 'town'), so it
// was never fetched at all, leaving it the one place in the district with no
// English label of our own to show over CARTO's Devanagari basemap text.
const PLACE_TYPES = ["city", "town", "village", "suburb", "neighbourhood", "hamlet"];

// Pulls every real place OSM has tagged inside the Chitwan bbox via the
// public Overpass API. Same bbox, `way`->`out center` resolution, and dedup
// pass as the POI fetchers in poisData.js (dedupePois groups by `.category`,
// reused here with the OSM `place` tag value standing in for it).
export async function fetchPlaces() {
  const { south, west, north, east } = CHITWAN_BBOX;
  const bbox = `${south},${west},${north},${east}`;
  const placeAlt = PLACE_TYPES.join("|");
  const query = `
    [out:json][timeout:90];
    (
      node["place"~"^(${placeAlt})$"](${bbox});
      way["place"~"^(${placeAlt})$"](${bbox});
    );
    out center;
  `;

  const data = await queryOverpass(query);

  const rawPlaces = data.elements
    .map((el) => {
      const lat = el.type === "node" ? el.lat : el.center?.lat;
      const lng = el.type === "node" ? el.lon : el.center?.lon;
      if (lat == null || lng == null) return null;
      // Prefer the OSM-mapper-provided English transliteration (`name:en`)
      // over the primary `name` tag, which for many Chitwan places is set
      // to the local Devanagari spelling (e.g. "गीतानगर") — a Romanized
      // search for "Gitanagar" needs the `name:en` value ("Gitanagar") to
      // ever match at all, not just a diacritic-insensitive comparison.
      // Skip unnamed OSM entries entirely — an unlabeled place isn't
      // searchable by name and so isn't useful in this gazetteer.
      const name = el.tags?.["name:en"] ?? el.tags?.name;
      if (!name) return null;
      const placeType = el.tags?.place;
      return { name, category: placeType, lat, lng, isWay: el.type === "way" };
    })
    .filter(Boolean);

  const { pois: deduped, removedCount } = dedupePois(rawPlaces);
  console.log(`Removed ${removedCount} duplicate places out of ${rawPlaces.length} fetched.`);

  return deduped.map(({ isWay, category, ...rest }) => ({ ...rest, placeType: category }));
}
