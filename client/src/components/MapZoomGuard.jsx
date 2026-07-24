import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { CHITWAN_BOUNDS } from "../lib/mapConfig.js";

// Keeps zoom-out from going past "full Chitwan district visible". minZoom is
// computed from the viewport rather than hardcoded, since the zoom level that
// exactly fits CHITWAN_BOUNDS depends on the screen/window size.
export default function MapZoomGuard() {
  const map = useMap();

  useEffect(() => {
    const applyMinZoom = () => {
      map.invalidateSize();
      const fitZoom = map.getBoundsZoom(CHITWAN_BOUNDS);
      map.setMinZoom(fitZoom);
      if (map.getZoom() < fitZoom) map.setZoom(fitZoom);
    };

    applyMinZoom();
    window.addEventListener("resize", applyMinZoom);
    return () => window.removeEventListener("resize", applyMinZoom);
  }, [map]);

  return null;
}
