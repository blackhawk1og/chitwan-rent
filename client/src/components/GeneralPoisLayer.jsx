import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { MdRestaurant, MdLocalCafe, MdLocalPharmacy, MdTempleBuddhist, MdAccountBalance, MdPlace } from "react-icons/md";
import { createLabeledPoiIcon } from "../lib/mapIcons.jsx";
import { CATEGORY_TIER, POI_COLOR, poiTierForZoom } from "../lib/poiTiers.js";

// Real-world hospital signage (and Google Maps' own hospital pins) uses a
// bold plain "H" rather than a detailed pictogram — matches that convention
// instead of react-icons' more illustrative hospital/medical-bag glyphs.
// Accepts the same {size, color} props every other icon component here
// does, so it drops into createLabeledPoiIcon unchanged.
function HospitalLetterIcon({ size, color }) {
  return (
    <span style={{ fontSize: size, fontWeight: 800, color, lineHeight: 1, fontFamily: "Arial, sans-serif" }}>H</span>
  );
}

// Icon glyphs are Material Design icons (react-icons/md — self-hosted SVGs,
// Apache-2.0-licensed Google icon set, no CDN/font dependency) except
// hospital/clinic, which use the plain-"H" glyph above. Pin badge colors
// follow Google Maps' own category convention (see POI_COLOR) rather than a
// custom per-category palette — orange for food & drink, red for medical,
// green for parks/landmarks, and a neutral gray for temples (no dedicated
// Google hue exists for religious sites). Hotel/lodging, shop, fuel, and gym
// are deliberately absent — all removed from the POI set entirely
// (shop/fuel/gym were the only categories using Google's blue).
const CATEGORY_STYLE = {
  restaurant: { Icon: MdRestaurant, bg: POI_COLOR.orange },
  cafe: { Icon: MdLocalCafe, bg: POI_COLOR.orange },
  hospital: { Icon: HospitalLetterIcon, bg: POI_COLOR.red },
  clinic: { Icon: HospitalLetterIcon, bg: POI_COLOR.red },
  pharmacy: { Icon: MdLocalPharmacy, bg: POI_COLOR.red },
  temple: { Icon: MdTempleBuddhist, bg: POI_COLOR.gray },
  landmark: { Icon: MdAccountBalance, bg: POI_COLOR.green },
};

// Derived from CATEGORY_TIER so the categories fetched from the API can
// never drift out of sync with the ones this layer actually knows how to
// tier/style.
export const GENERAL_POI_CATEGORIES = Object.keys(CATEGORY_TIER)
  .filter((c) => c !== "school" && c !== "college")
  .join(",");

// Minimum on-screen spacing (px) enforced between pins so the map doesn't
// render overlapping/stacked icons in dense areas. Real Google Maps never
// shows every single POI at once — it thins to a readable, evenly-spaced
// set that favors more prominent categories over minor ones when two pins
// are too close together to both show. This declutter pass is what
// implements that; it does not touch PoisLayer.jsx (schools/colleges),
// which intentionally still renders every pin.
const MIN_PIN_SPACING_PX = 55;

// Greedy, tier-priority spatial thinning: walks candidates most-important
// first (lower tier number) and keeps a pin only if it isn't within
// MIN_PIN_SPACING_PX of an already-kept pin. A grid bucket keyed by cell
// (sized to the spacing threshold) keeps this roughly O(n) instead of
// O(n^2) — only the 3x3 neighborhood of cells around a candidate can
// possibly contain a conflicting point.
function declutterPois(pois, map, zoom) {
  const sorted = [...pois].sort((a, b) => (CATEGORY_TIER[a.category] ?? 5) - (CATEGORY_TIER[b.category] ?? 5));

  const grid = new Map(); // "cellX,cellY" -> [{x,y}]
  const kept = [];

  for (const poi of sorted) {
    const point = map.project([poi.lat, poi.lng], zoom);
    const cellX = Math.floor(point.x / MIN_PIN_SPACING_PX);
    const cellY = Math.floor(point.y / MIN_PIN_SPACING_PX);

    let tooClose = false;
    for (let dx = -1; dx <= 1 && !tooClose; dx++) {
      for (let dy = -1; dy <= 1 && !tooClose; dy++) {
        const bucket = grid.get(`${cellX + dx},${cellY + dy}`);
        if (!bucket) continue;
        for (const p of bucket) {
          if (Math.hypot(p.x - point.x, p.y - point.y) < MIN_PIN_SPACING_PX) {
            tooClose = true;
            break;
          }
        }
      }
    }
    if (tooClose) continue;

    const key = `${cellX},${cellY}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(point);
    kept.push(poi);
  }

  return kept;
}

export default function GeneralPoisLayer({ pois }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const activeTier = poiTierForZoom(zoom);

  // Every POI whose tier has been reached is a candidate to render as its
  // own pin — no clustering at any density. Below tier 1, nothing renders.
  const visiblePois = useMemo(
    () => (activeTier === 0 ? [] : pois.filter((p) => (CATEGORY_TIER[p.category] ?? 5) <= activeTier)),
    [pois, activeTier]
  );

  const declutteredPois = useMemo(() => declutterPois(visiblePois, map, zoom), [visiblePois, map, zoom]);

  // Every category here reveals icon and label together at its own tier
  // zoom — no separate label-reveal offset like PoisLayer.jsx's schools use.
  // See getHalfwayLabelZoom in poiTiers.js if a delayed-label category is
  // ever needed here too.
  const icons = useMemo(
    () =>
      Object.fromEntries(
        declutteredPois.map((p) => {
          const style = CATEGORY_STYLE[p.category] ?? { Icon: MdPlace, bg: "#6b7280" };
          const icon = createLabeledPoiIcon(style.Icon, p.name, { bg: style.bg });
          return [p.id, icon];
        })
      ),
    [declutteredPois]
  );

  return (
    <>
      {declutteredPois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </>
  );
}
