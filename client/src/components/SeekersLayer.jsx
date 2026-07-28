import { useEffect, useMemo, useRef } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { User } from "lucide-react";
import { createDotIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";
import { createClusterClickHandler } from "../lib/clusterBehavior.js";

const seekerIcon = createDotIcon(User, { bg: "#14b8a6", size: 24 });

export default function SeekersLayer({ seekerPins, onSelect }) {
  const clusterRef = useRef(null);

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

  // Same leaflet.markercluster fixes as FlatsLayer — see clusterBehavior.js
  // and its comment there for why.
  useEffect(() => {
    const group = clusterRef.current;
    if (!group) return;
    const hideSpiderfiedBadge = (e) => e.cluster.setOpacity(0);
    group.on("spiderfied", hideSpiderfiedBadge);

    const handleClusterClick = createClusterClickHandler();
    group.off("clusterclick clusterkeypress", group._zoomOrSpiderfy, group);
    group.on("clusterclick clusterkeypress", handleClusterClick, group);

    return () => {
      group.off("spiderfied", hideSpiderfiedBadge);
      group.off("clusterclick clusterkeypress", handleClusterClick, group);
      group.on("clusterclick clusterkeypress", group._zoomOrSpiderfy, group);
    };
  }, []);

  return (
    <MarkerClusterGroup
      ref={clusterRef}
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
