export const CHITWAN_CENTER = [27.629, 84.353];
export const DEFAULT_ZOOM = 12;

export const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
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
