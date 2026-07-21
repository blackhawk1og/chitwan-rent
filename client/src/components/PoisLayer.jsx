import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { GraduationCap } from "lucide-react";
import { createLabeledPoiIcon } from "../lib/mapIcons.jsx";

export default function PoisLayer({ pois }) {
  const icons = useMemo(
    () => Object.fromEntries(pois.map((p) => [p.id, createLabeledPoiIcon(GraduationCap, p.name, { bg: "#38bdf8" })])),
    [pois]
  );

  return (
    <>
      {pois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </>
  );
}
