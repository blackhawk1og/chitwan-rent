import { useMemo } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Home } from "lucide-react";
import { createDotIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";

const flatIcon = createDotIcon(Home, { bg: "#7c3aed" });

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
          icon={flatIcon}
          eventHandlers={{ click: () => onSelect(flat) }}
        />
      ))}
    </MarkerClusterGroup>
  );
}
