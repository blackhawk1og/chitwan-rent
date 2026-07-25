import { useMemo } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { GraduationCap, BookOpen } from "lucide-react";
import { createLabeledPoiIcon, createPoiClusterIcon } from "../lib/mapIcons.jsx";

export default function PoisLayer({ pois }) {
  const icons = useMemo(
    () => Object.fromEntries(pois.map((p) => [p.id, createLabeledPoiIcon(GraduationCap, p.name, { bg: "#38bdf8" })])),
    [pois]
  );

  const iconCreateFunction = useMemo(
    () => (cluster) => createPoiClusterIcon(GraduationCap, cluster.getChildCount(), { secondaryIcon: BookOpen }),
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
