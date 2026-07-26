import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { MdSchool } from "react-icons/md";
import { createPoiPinIcon, createLabeledPoiIcon } from "../lib/mapIcons.jsx";
import { CATEGORY_TIER, POI_LABEL_ZOOM, poiTierForZoom } from "../lib/poiTiers.js";

const SCHOOL_ICON_BG = "#38bdf8";

export default function PoisLayer({ pois }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const activeTier = poiTierForZoom(zoom);
  const showLabels = zoom >= POI_LABEL_ZOOM;

  // College (tier 2) and school (tier 3) reveal at different zooms, same as
  // every other POI category — no clustering at any density, matching the
  // general-POI layer this shares its tier system with.
  const visiblePois = useMemo(
    () => (activeTier === 0 ? [] : pois.filter((p) => (CATEGORY_TIER[p.category] ?? 3) <= activeTier)),
    [pois, activeTier]
  );

  const icons = useMemo(
    () =>
      Object.fromEntries(
        visiblePois.map((p) => {
          const icon = showLabels
            ? createLabeledPoiIcon(MdSchool, p.name, { bg: SCHOOL_ICON_BG })
            : createPoiPinIcon(MdSchool, { bg: SCHOOL_ICON_BG, size: 26 });
          return [p.id, icon];
        })
      ),
    [visiblePois, showLabels]
  );

  return (
    <>
      {visiblePois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </>
  );
}
