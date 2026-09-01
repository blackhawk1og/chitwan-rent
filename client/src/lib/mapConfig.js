export const CHITWAN_CENTER = [27.634, 84.429];
export const DEFAULT_ZOOM = 12;

// CARTO now expects an API key on its basemap tile requests, attached as a
// `key` query parameter (their documented Leaflet form is
// `.../{z}/{x}/{y}.png?key=YOUR_KEY`). Keys are per-domain and free up to a
// fair-use limit, so this is read from the environment rather than committed
// — see CARTO_API_KEY in client/.env.example.
//
// Deliberately optional: as of writing, these tile paths still serve normally
// with no key at all, so a missing key degrades to exactly today's behaviour
// (unkeyed requests, subject to CARTO's watermark rollout) instead of leaving
// a contributor with a blank map. Only the CARTO layers take the key — the
// satellite layer below is Esri's and is unrelated.
const CARTO_API_KEY = import.meta.env.CARTO_API_KEY;

function withCartoKey(url) {
  return CARTO_API_KEY ? `${url}?key=${encodeURIComponent(CARTO_API_KEY)}` : url;
}

// Split into a labels-free base layer plus a separate labels-only overlay
// (both official CARTO Dark Matter variants) so label contrast can be
// boosted independently of the road/water/fill colors underneath — see
// DARK_LABEL_TILE_CLASS usage in MapShell for the contrast boost itself.
export const DARK_TILE_URL = withCartoKey(
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
);
export const DARK_LABEL_TILE_URL = withCartoKey(
  "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
);
export const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics";

// Chitwan district, roughly: Bharatpur / Ratnanagar / Khairahani / Kalika / Rapti / Ichchhakamana
export const CHITWAN_NOMINATIM_VIEWBOX = "84.15,27.80,84.65,27.45";

// Same extent as the viewbox above, expressed as a Leaflet LatLngBoundsExpression
// (southWest, northEast) — single source of truth for both the geocoder viewbox
// and the map's pan/zoom-out limits.
export const CHITWAN_BOUNDS = [
  [27.45, 84.15],
  [27.8, 84.65],
];
