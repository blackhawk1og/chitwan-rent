import { useMemo } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { createFlatInfoChipIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";

export default function FlatsLayer({ flats, onSelect }) {
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
          createFlatInfoChipIcon({ bhk: flat.bhk, rent: flat.rent, rating: flat.rating, gated: flat.gated }),
        ])
      ),
    [flats]
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
