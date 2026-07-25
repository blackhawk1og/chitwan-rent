import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  Utensils,
  Coffee,
  Stethoscope,
  Pill,
  Landmark,
  Banknote,
  Dumbbell,
  ShoppingBag,
  Church,
  Fuel,
  BedDouble,
  Building2,
} from "lucide-react";
import { createDotIcon, createLabeledPoiIcon, createPoiClusterIcon } from "../lib/mapIcons.jsx";

// Zoom thresholds for progressive density reveal — no general POI pins at
// all below tier 1 (matches "fully zoomed out" reference), each tier adds
// more categories as the user zooms in further. Named/centralized here,
// same convention as other zoom-tiered map layers (e.g. FlatsLayer's
// FLAT_CHIP_ZOOM_SCALE).
export const POI_TIER_1_ZOOM = 13; // hospitals, temples, landmarks — sparse, icon-only
export const POI_TIER_2_ZOOM = 15; // + cafes, restaurants, hotels, banks/ATMs
export const POI_TIER_3_ZOOM = 17; // + shops, gyms, pharmacies, fuel — full density
export const POI_LABEL_ZOOM = 18; // icon-only below this; icon+label at/above it

const CATEGORY_TIER = {
  hospital: 1,
  clinic: 1,
  temple: 1,
  landmark: 1,
  cafe: 2,
  restaurant: 2,
  hotel: 2,
  bank: 2,
  atm: 2,
  shop: 3,
  gym: 3,
  pharmacy: 3,
  fuel: 3,
};

const CATEGORY_STYLE = {
  restaurant: { Icon: Utensils, bg: "#f97316" },
  cafe: { Icon: Coffee, bg: "#a16207" },
  hospital: { Icon: Stethoscope, bg: "#ef4444" },
  clinic: { Icon: Stethoscope, bg: "#ef4444" },
  pharmacy: { Icon: Pill, bg: "#ec4899" },
  bank: { Icon: Landmark, bg: "#22c55e" },
  atm: { Icon: Banknote, bg: "#16a34a" },
  fuel: { Icon: Fuel, bg: "#64748b" },
  gym: { Icon: Dumbbell, bg: "#8b5cf6" },
  temple: { Icon: Church, bg: "#eab308" },
  landmark: { Icon: Building2, bg: "#06b6d4" },
  hotel: { Icon: BedDouble, bg: "#3b82f6" },
  shop: { Icon: ShoppingBag, bg: "#14b8a6" },
};

// Derived from CATEGORY_TIER so the categories fetched from the API can
// never drift out of sync with the ones this layer actually knows how to
// tier/style.
export const GENERAL_POI_CATEGORIES = Object.keys(CATEGORY_TIER).join(",");

function tierForZoom(zoom) {
  if (zoom >= POI_TIER_3_ZOOM) return 3;
  if (zoom >= POI_TIER_2_ZOOM) return 2;
  if (zoom >= POI_TIER_1_ZOOM) return 1;
  return 0;
}

export default function GeneralPoisLayer({ pois }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const activeTier = tierForZoom(zoom);
  const showLabels = zoom >= POI_LABEL_ZOOM;

  const visiblePois = useMemo(
    () => (activeTier === 0 ? [] : pois.filter((p) => (CATEGORY_TIER[p.category] ?? 3) <= activeTier)),
    [pois, activeTier]
  );

  const icons = useMemo(
    () =>
      Object.fromEntries(
        visiblePois.map((p) => {
          const style = CATEGORY_STYLE[p.category] ?? { Icon: Building2, bg: "#6b7280" };
          const icon = showLabels
            ? createLabeledPoiIcon(style.Icon, p.name, { bg: style.bg })
            : createDotIcon(style.Icon, { bg: style.bg, size: 22 });
          return [p.id, icon];
        })
      ),
    [visiblePois, showLabels]
  );

  const iconCreateFunction = useMemo(() => (cluster) => createPoiClusterIcon(Building2, cluster.getChildCount()), []);

  if (!activeTier) return null;

  return (
    <MarkerClusterGroup
      iconCreateFunction={iconCreateFunction}
      maxClusterRadius={45}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      disableClusteringAtZoom={19}
    >
      {visiblePois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </MarkerClusterGroup>
  );
}
