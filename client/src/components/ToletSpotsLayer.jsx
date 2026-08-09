import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { createToLetPillIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";

// To-Let pins only reveal once zoomed in past the default whole-district
// view — same "don't clutter the default view" reasoning as the POI
// zoom-tier system (see poiTiers.js's own comment on why its tiers start
// well past DEFAULT_ZOOM), just a single flat threshold here rather than a
// multi-tier progression, since there's only one to-let pin type.
// DEFAULT_ZOOM (mapConfig.js) is 12 — two zoom-in steps past that is 14.
// Named/exported so it's easy to retune after visual testing, same
// convention as FlatsLayer's FLAT_CHIP_ZOOM_SCALE.
export const TOLET_SPOTS_MIN_ZOOM = 14;

// Baked into the icon (see createToLetPillIcon), not re-created per spot —
// every pill looks identical, so one shared icon instance is enough.
const toletIcon = createToLetPillIcon();

// Nearby pins group into a cluster once zoomed in enough to render
// individually — same MarkerClusterGroup + badge approach as FlatsLayer,
// just a single "<count> TO-LET" line instead of flats' two-line "X flats" /
// "AVLB X" — no line2 passed, so createClusterBadgeIcon collapses to its
// compact one-line sizing automatically.
function toletClusterIcon(cluster) {
  const count = cluster.getChildCount();
  return createClusterBadgeIcon({
    line1: `${count} TO-LET`,
    tone: "light",
  });
}

export default function ToletSpotsLayer({ spots, onSelect }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const visibleSpots = useMemo(
    () => (zoom >= TOLET_SPOTS_MIN_ZOOM ? spots : []),
    [spots, zoom]
  );

  return (
    <MarkerClusterGroup
      iconCreateFunction={toletClusterIcon}
      maxClusterRadius={60}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
    >
      {visibleSpots.map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lng]}
          icon={toletIcon}
          eventHandlers={{ click: () => onSelect(spot) }}
        />
      ))}
    </MarkerClusterGroup>
  );
}
