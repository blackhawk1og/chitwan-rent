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
export const POI_TIER_1_ZOOM = 11; // national park gates, major civic landmarks — almost nothing else
export const POI_TIER_2_ZOOM = 13; // + hospitals, clinics, colleges, temples, hotels/resorts
export const POI_TIER_3_ZOOM = 14; // + schools, restaurants, fuel stations
export const POI_TIER_4_ZOOM = 16; // + shops, cafes, gyms
export const POI_TIER_5_ZOOM = 17; // + pharmacies — everything now visible
export const POI_LABEL_ZOOM = 18; // icon-only below this; icon+label at/above it

// Category -> tier. Where OSM/our data doesn't distinguish "major" from
// "minor" within one category (e.g. every temple is just category="temple",
// every hotel just "hotel"), the whole category is assigned a single tier
// judged by its typical real-world prominence, per the reference screenshots.
export const CATEGORY_TIER = {
  landmark: 1,
  hospital: 2,
  clinic: 2,
  college: 2,
  temple: 2,
  hotel: 2,
  school: 3,
  restaurant: 3,
  fuel: 3,
  shop: 4,
  cafe: 4,
  gym: 4,
  pharmacy: 5,
};

export function poiTierForZoom(zoom) {
  if (zoom >= POI_TIER_5_ZOOM) return 5;
  if (zoom >= POI_TIER_4_ZOOM) return 4;
  if (zoom >= POI_TIER_3_ZOOM) return 3;
  if (zoom >= POI_TIER_2_ZOOM) return 2;
  if (zoom >= POI_TIER_1_ZOOM) return 1;
  return 0;
}
