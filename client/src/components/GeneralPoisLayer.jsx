import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
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
import { createPoiPinIcon, createLabeledPoiIcon, createPoiClusterIcon } from "../lib/mapIcons.jsx";

// Zoom thresholds for progressive density reveal — no general POI pins at
// all below tier 1 (matches "fully zoomed out" reference), each tier adds
// more categories as the user zooms in further. Named/centralized here,
// same convention as other zoom-tiered map layers (e.g. FlatsLayer's
// FLAT_CHIP_ZOOM_SCALE).
export const POI_TIER_1_ZOOM = 13; // hospitals, temples, landmarks — sparse, icon-only
export const POI_TIER_2_ZOOM = 15; // + cafes, restaurants, hotels
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
  shop: 3,
  gym: 3,
  pharmacy: 3,
  fuel: 3,
};

// Icon glyphs are Material Design icons (react-icons/md — self-hosted SVGs,
// Apache-2.0-licensed Google icon set, no CDN/font dependency), matching
// Google Maps' own POI pin visual language. Marker shape/size/color-coding
// is unchanged — only the glyph inside each circular badge changed.
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
          const style = CATEGORY_STYLE[p.category] ?? { Icon: MdPlace, bg: "#6b7280" };
          const icon = showLabels
            ? createLabeledPoiIcon(style.Icon, p.name, { bg: style.bg })
            : createPoiPinIcon(style.Icon, { bg: style.bg, size: 26 });
          return [p.id, icon];
        })
      ),
    [visiblePois, showLabels]
  );

  const iconCreateFunction = useMemo(() => (cluster) => createPoiClusterIcon(MdPlace, cluster.getChildCount()), []);

  if (!activeTier) return null;

  // Must sit at or below the map's actual reachable max zoom (see prior fix:
  // a threshold above maxZoom is unreachable and clusters never disassemble)
  // — but pinning it to exactly maxZoom means the very last, tightest
  // residual clusters (e.g. several shops sharing one building) only pop
  // into individual pins on the final possible zoom step, which reads as an
  // abrupt swap rather than a natural zoom-in. Backing it off by 2 levels
  // means that swap happens while there's still real-world separation to
  // read: at this dataset's latitude, maxClusterRadius (45px) covers ~95m
  // at maxZoom-2 vs. ~24m at maxZoom itself, so most clustered points have
  // already spread out visually by the time clustering turns off — the only
  // pairs that still overlap post-disassembly are ones sitting a few meters
  // apart in reality (e.g. two counters in the same building), which no
  // reachable zoom can separate anyway and which every pin-map (Google Maps
  // included) just renders as slightly overlapping markers.
  const disableClusteringAtZoom = Math.max(map.getMinZoom(), map.getMaxZoom() - 2);

  return (
    <MarkerClusterGroup
      iconCreateFunction={iconCreateFunction}
      maxClusterRadius={45}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      disableClusteringAtZoom={disableClusteringAtZoom}
    >
      {visiblePois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </MarkerClusterGroup>
  );
}
