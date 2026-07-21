import { useMemo } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { User } from "lucide-react";
import { createDotIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";

const seekerIcon = createDotIcon(User, { bg: "#14b8a6", size: 24 });

export default function SeekersLayer({ seekerPins, onSelect }) {
  const iconCreateFunction = useMemo(
    () => (cluster) => {
      const count = cluster.getChildCount();
      return createClusterBadgeIcon({
        line1: `${count}`,
        line2: `seeker${count === 1 ? "" : "s"}`,
        tone: "teal",
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
      {seekerPins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={seekerIcon}
          eventHandlers={{ click: () => onSelect(pin) }}
        />
      ))}
    </MarkerClusterGroup>
  );
}
