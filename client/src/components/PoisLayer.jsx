import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { MdSchool } from "react-icons/md";
import { createPoiPinIcon, createLabeledPoiIcon } from "../lib/mapIcons.jsx";
import {
  CATEGORY_TIER,
  POI_LABEL_ZOOM,
  POI_COLOR,
  poiTierForZoom,
  POI_TIER_3_ZOOM,
  MAP_MAX_ZOOM,
  getHalfwayLabelZoom,
} from "../lib/poiTiers.js";

// Blue was retired map-wide (it was the "general POI/shopping/services" hue
// — shop/fuel/gym, the categories that used it, were all removed), so
// schools/colleges render in purple instead.
const SCHOOL_ICON_BG = POI_COLOR.purple;

// Schools are exempt from the tier system (see visiblePois below — their
// icon is always visible, at any zoom), so a flat icon-to-label gap like
// every other category uses doesn't apply cleanly to them: it would either
// clutter the map with labels as soon as the user zooms in at all, or
// withhold labels until the very last zoom step. Instead their label
// reveals halfway between their category's designated icon-reveal zoom
// (tier 3, same as restaurants) and the map's max zoom — proportional to
// how far zoomed in the user already is. College, which this same layer
// also renders, is NOT exempt from the tier system and keeps the flat
// POI_LABEL_ZOOM gap every other category uses.
const SCHOOL_LABEL_ZOOM = getHalfwayLabelZoom(POI_TIER_3_ZOOM, MAP_MAX_ZOOM);
const labelZoomFor = (category) => (category === "school" ? SCHOOL_LABEL_ZOOM : POI_LABEL_ZOOM);

export default function PoisLayer({ pois }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const activeTier = poiTierForZoom(zoom);

  // Schools are always visible regardless of zoom — deliberately exempt from
  // the tier system every other POI category (including college) still
  // follows, so they never disappear no matter how far the user zooms out.
  // College still reveals at tier 2, same as every other POI category — no
  // clustering at any density, matching the general-POI layer this shares
  // its tier system with.
  const visiblePois = useMemo(
    () =>
      pois.filter((p) => p.category === "school" || (activeTier > 0 && (CATEGORY_TIER[p.category] ?? 3) <= activeTier)),
    [pois, activeTier]
  );

  const icons = useMemo(
    () =>
      Object.fromEntries(
        visiblePois.map((p) => {
          const icon =
            zoom >= labelZoomFor(p.category)
              ? createLabeledPoiIcon(MdSchool, p.name, { bg: SCHOOL_ICON_BG })
              : createPoiPinIcon(MdSchool, { bg: SCHOOL_ICON_BG });
          return [p.id, icon];
        })
      ),
    [visiblePois, zoom]
  );

  return (
    <>
      {visiblePois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </>
  );
}
