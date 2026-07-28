// Shared zoom-tier system for ALL POI pins (schools/colleges AND the
// general-category layer) — replaces marker clustering entirely. A POI
// either renders as its own individual pin (its tier has been reached) or
// doesn't render at all (it hasn't yet); there is no bubbled/grouped state
// at any zoom level, matching the Google Maps reference this app is styled
// after (sparse landmarks when zoomed out, progressively denser individual
// pins as you zoom in — never a cluster bubble, even at max density).
//
// Both POI layers import this one module so a college (tier 2, schools
// layer) and a hospital (tier 2, general layer) reveal at the exact same
// zoom, giving one cohesive combined progression instead of two
// independently-tuned systems.
// DEFAULT_ZOOM (mapConfig.js) is 12 — the "whole district" overview. Tier 1
// deliberately starts well past that (not at/before it) so the default view
// and any modest zoom-in stay completely free of POI pins, matching Google
// Maps' own behavior of showing ~zero POI icons until the user has zoomed in
// meaningfully past a whole-city/region view.
export const POI_TIER_1_ZOOM = 14; // national park gates, major civic landmarks — almost nothing else
export const POI_TIER_2_ZOOM = 15; // + hospitals, clinics, colleges, temples
export const POI_TIER_3_ZOOM = 16; // + schools, restaurants
export const POI_TIER_4_ZOOM = 17; // + cafes
export const POI_TIER_5_ZOOM = 18; // + pharmacies — everything now visible
export const POI_LABEL_ZOOM = 18; // icon-only below this; icon+label at/above it

// The map's own max zoom (matches the default every TileLayer in this app
// uses — none override it). The ceiling getHalfwayLabelZoom interpolates
// toward for categories that use a proportional, rather than flat, gap
// between their icon-reveal zoom and their label-reveal zoom.
export const MAP_MAX_ZOOM = 18;

// Halfway point between a category's icon-reveal zoom and the map's max
// zoom — for categories whose label should reveal proportionally to how far
// zoomed in the user already is, rather than at a fixed icon-to-label gap
// like POI_LABEL_ZOOM. Named and exported so it's easy to apply to another
// category later without re-deriving the formula inline.
export function getHalfwayLabelZoom(iconZoom, maxZoom) {
  return iconZoom + (maxZoom - iconZoom) / 2;
}

// Category -> tier. Where OSM/our data doesn't distinguish "major" from
// "minor" within one category (e.g. every temple is just category="temple"),
// the whole category is assigned a single tier judged by its typical
// real-world prominence, per the reference screenshots. Hotel, shop, fuel,
// and gym are deliberately absent — dropped from the POI set entirely
// (shop/fuel/gym were the app's "general POI blue" categories, removed
// together with the request to clear every blue pin off the map).
export const CATEGORY_TIER = {
  landmark: 1,
  hospital: 2,
  clinic: 2,
  college: 2,
  temple: 2,
  school: 3,
  restaurant: 3,
  cafe: 4,
  pharmacy: 5,
};

// Google Maps' own POI color convention, reused by both POI layers. No
// category uses "blue" (Google's general-POI/shopping/services hue) anymore
// — the categories that used to (shop, fuel, gym) were removed entirely.
// Schools/colleges moved off blue too, onto purple, so the map has zero blue
// pins left while still keeping education pins on the map.
export const POI_COLOR = {
  orange: "#FF9800", // food & drink, temples/religious sites
  red: "#EA4335", // medical
  purple: "#9C27B0", // education (schools/colleges) — previously "entertainment, arts, lodging" before hotel was removed
  green: "#0F9D58", // parks, nature, outdoor recreation
};

export function poiTierForZoom(zoom) {
  if (zoom >= POI_TIER_5_ZOOM) return 5;
  if (zoom >= POI_TIER_4_ZOOM) return 4;
  if (zoom >= POI_TIER_3_ZOOM) return 3;
  if (zoom >= POI_TIER_2_ZOOM) return 2;
  if (zoom >= POI_TIER_1_ZOOM) return 1;
  return 0;
}
