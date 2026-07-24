import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { createFlatInfoChipIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";

// Zoom thresholds for progressively shrinking the flat info chip as the user
// zooms in further — named/centralized here so they're easy to retune after
// visual testing, same convention as other zoom-tiered map layers.
export const FLAT_CHIP_ZOOM_SCALE = {
  compact: 16, // first size-down step
  tight: 18, // second size-down step
};

function chipSizeTier(zoom) {
  if (zoom >= FLAT_CHIP_ZOOM_SCALE.tight) return "tight";
  if (zoom >= FLAT_CHIP_ZOOM_SCALE.compact) return "compact";
  return "base";
}

export default function FlatsLayer({ flats, onSelect }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const sizeTier = chipSizeTier(zoom);

  const iconCreateFunction = useMemo(
    () => (cluster) => {
      const count = cluster.getChildCount();
      return createClusterBadgeIcon({
        line1: `${count} flat${count === 1 ? "" : "s"}`,
        line2: `AVLB ${count}`,
        tone: "light",
      });
    },
    []
  );

  const icons = useMemo(
    () =>
      Object.fromEntries(
        flats.map((flat) => [
          flat.id,
          createFlatInfoChipIcon({ bhk: flat.bhk, rent: flat.rent, rating: flat.rating, gated: flat.gated, sizeTier }),
        ])
      ),
    [flats, sizeTier]
  );

  return (
    <MarkerClusterGroup
      iconCreateFunction={iconCreateFunction}
      maxClusterRadius={60}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
    >
      {flats.map((flat) => (
        <Marker
          key={flat.id}
          position={[flat.lat, flat.lng]}
          icon={icons[flat.id]}
          eventHandlers={{ click: () => onSelect(flat) }}
        />
      ))}
    </MarkerClusterGroup>
  );
}
