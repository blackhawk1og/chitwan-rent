import { useMemo } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { GraduationCap } from "lucide-react";
import { createLabeledPoiIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";

export default function PoisLayer({ pois }) {
  const icons = useMemo(
    () => Object.fromEntries(pois.map((p) => [p.id, createLabeledPoiIcon(GraduationCap, p.name, { bg: "#38bdf8" })])),
    [pois]
  );

  const iconCreateFunction = useMemo(
    () => (cluster) => {
      const count = cluster.getChildCount();
      return createClusterBadgeIcon({
        line1: `${count}`,
        line2: `school${count === 1 ? "" : "s"}`,
        tone: "light",
      });
    },
    []
  );

  return (
    <MarkerClusterGroup
      iconCreateFunction={iconCreateFunction}
      maxClusterRadius={90}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
    >
      {pois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </MarkerClusterGroup>
  );
}
