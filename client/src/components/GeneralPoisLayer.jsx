import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import {
  MdRestaurant,
  MdLocalCafe,
  MdLocalHospital,
  MdMedicalServices,
  MdLocalPharmacy,
  MdLocalGasStation,
  MdFitnessCenter,
  MdTempleBuddhist,
  MdAccountBalance,
  MdHotel,
  MdStorefront,
  MdPlace,
} from "react-icons/md";
import { createPoiPinIcon, createLabeledPoiIcon } from "../lib/mapIcons.jsx";
import { CATEGORY_TIER, POI_LABEL_ZOOM, poiTierForZoom } from "../lib/poiTiers.js";

// Icon glyphs are Material Design icons (react-icons/md — self-hosted SVGs,
// Apache-2.0-licensed Google icon set, no CDN/font dependency), matching
// Google Maps' own POI pin visual language. Marker shape/size/color-coding
// is unchanged — only the glyph inside each pin changed.
const CATEGORY_STYLE = {
  restaurant: { Icon: MdRestaurant, bg: "#f97316" },
  cafe: { Icon: MdLocalCafe, bg: "#a16207" },
  hospital: { Icon: MdLocalHospital, bg: "#ef4444" },
  clinic: { Icon: MdMedicalServices, bg: "#ef4444" },
  pharmacy: { Icon: MdLocalPharmacy, bg: "#ec4899" },
  fuel: { Icon: MdLocalGasStation, bg: "#64748b" },
  gym: { Icon: MdFitnessCenter, bg: "#8b5cf6" },
  temple: { Icon: MdTempleBuddhist, bg: "#eab308" },
  landmark: { Icon: MdAccountBalance, bg: "#06b6d4" },
  hotel: { Icon: MdHotel, bg: "#3b82f6" },
  shop: { Icon: MdStorefront, bg: "#14b8a6" },
};

// Derived from CATEGORY_TIER so the categories fetched from the API can
// never drift out of sync with the ones this layer actually knows how to
// tier/style.
export const GENERAL_POI_CATEGORIES = Object.keys(CATEGORY_TIER)
  .filter((c) => c !== "school" && c !== "college")
  .join(",");

export default function GeneralPoisLayer({ pois }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const activeTier = poiTierForZoom(zoom);
  const showLabels = zoom >= POI_LABEL_ZOOM;

  // Every POI whose tier has been reached renders as its own pin — no
  // clustering at any density. Below tier 1, nothing renders at all.
  const visiblePois = useMemo(
    () => (activeTier === 0 ? [] : pois.filter((p) => (CATEGORY_TIER[p.category] ?? 5) <= activeTier)),
    [pois, activeTier]
  );

  const icons = useMemo(
    () =>
      Object.fromEntries(
        visiblePois.map((p) => {
          const style = CATEGORY_STYLE[p.category] ?? { Icon: MdPlace, bg: "#6b7280" };
          const icon = showLabels
            ? createLabeledPoiIcon(style.Icon, p.name, { bg: style.bg })
            : createPoiPinIcon(style.Icon, { bg: style.bg, size: 26 });
          return [p.id, icon];
        })
      ),
    [visiblePois, showLabels]
  );

  return (
    <>
      {visiblePois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </>
  );
}
