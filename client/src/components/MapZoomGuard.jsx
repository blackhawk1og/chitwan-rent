import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { CHITWAN_BOUNDS, DEFAULT_ZOOM } from "../lib/mapConfig.js";

// Keeps zoom-out from going past "full Chitwan district visible". minZoom is
// computed from the viewport rather than hardcoded, since the zoom level that
// exactly fits CHITWAN_BOUNDS depends on the screen/window size.
//
// Capped at DEFAULT_ZOOM (never passed straight through) so this can only
// ever pull the floor DOWN from the default, on viewports too small to fit
// the district at DEFAULT_ZOOM — never push it up. On a wide/large viewport,
// fitZoom can exceed DEFAULT_ZOOM (the district fits with room to spare at
// zoom 12), and Leaflet's own setMinZoom forces the current zoom up to match
// its new minimum whenever that minimum rises above it — uncapped, that
// silently zoomed the initial view in past DEFAULT_ZOOM on large screens,
// making the app's starting view drift by screen size instead of always
// matching mapConfig.js's intended default.
export default function MapZoomGuard() {
  const map = useMap();

  useEffect(() => {
    const applyMinZoom = () => {
      map.invalidateSize();
      const fitZoom = map.getBoundsZoom(CHITWAN_BOUNDS);
      map.setMinZoom(Math.min(fitZoom, DEFAULT_ZOOM));
    };

    applyMinZoom();
    window.addEventListener("resize", applyMinZoom);
    return () => window.removeEventListener("resize", applyMinZoom);
  }, [map]);

  return null;
}
