import { useMemo } from "react";
import { Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MdSchool, MdMenuBook } from "react-icons/md";
import { createLabeledPoiIcon, createPoiClusterIcon } from "../lib/mapIcons.jsx";

export default function PoisLayer({ pois }) {
  const icons = useMemo(
    () => Object.fromEntries(pois.map((p) => [p.id, createLabeledPoiIcon(MdSchool, p.name, { bg: "#38bdf8" })])),
    [pois]
  );

  const iconCreateFunction = useMemo(
    () => (cluster) => createPoiClusterIcon(MdSchool, cluster.getChildCount(), { secondaryIcon: MdMenuBook }),
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
