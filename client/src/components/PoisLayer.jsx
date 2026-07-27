import { useEffect, useMemo, useRef, useState } from "react";
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

// Must be >= the pin-glow-blink animation's own duration (0.5s * 1 = 0.5s) so
// the glow class isn't removed mid-blink.
const GLOW_DURATION_MS = 600;

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

  // This component only mounts while the Schools toggle is on (see MapShell:
  // `{schoolsOn && <PoisLayer ... />}`), so this is exactly "the button was
  // just turned on" — no prop plumbing needed from IconStack. The glow fires
  // once the FIRST time a pin actually becomes visible (not from raw mount
  // time), since the map may still be zoomed out below the school reveal
  // tier right when the toggle is clicked — firing from mount alone would
  // let the glow window silently expire before any pin ever appears.
  //
  // The "turn it back off" timer is deliberately NOT torn down by this
  // effect's own cleanup — visiblePois can legitimately get a new array
  // reference again later (e.g. as Leaflet's zoom settles through
  // intermediate values while still within the same tier), which would
  // re-run this effect. If its cleanup canceled the pending timeout on every
  // such re-run, and the early-return guard then skipped scheduling a
  // replacement, justTurnedOn would get stuck true forever. The timer is
  // only ever cleared on true unmount (the second effect below).
  const [justTurnedOn, setJustTurnedOn] = useState(false);
  const hasGlowedRef = useRef(false);
  const glowTimeoutRef = useRef(null);

  useEffect(() => {
    if (hasGlowedRef.current || visiblePois.length === 0) return;
    hasGlowedRef.current = true;
    setJustTurnedOn(true);
    glowTimeoutRef.current = setTimeout(() => setJustTurnedOn(false), GLOW_DURATION_MS);
  }, [visiblePois]);

  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    };
  }, []);

  const icons = useMemo(
    () =>
      Object.fromEntries(
        visiblePois.map((p) => {
          const icon =
            zoom >= labelZoomFor(p.category)
              ? createLabeledPoiIcon(MdSchool, p.name, { bg: SCHOOL_ICON_BG, glow: justTurnedOn })
              : createPoiPinIcon(MdSchool, { bg: SCHOOL_ICON_BG, size: 26, glow: justTurnedOn });
          return [p.id, icon];
        })
      ),
    [visiblePois, zoom, justTurnedOn]
  );

  return (
    <>
      {visiblePois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons[poi.id]} />
      ))}
    </>
  );
}
