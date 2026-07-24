import { useMapEvents } from "react-leaflet";

// Fires onEmptyTap only for clicks that land on the bare map background —
// not on a marker, cluster badge, or any other interactive map layer.
// Leaflet's map click event bubbles up from those layers too by default, so
// we inspect the originating DOM element rather than relying on the layers
// themselves to stop propagation (which would need patching every marker
// layer individually and is easy to miss one).
export default function EmptyTapCatcher({ onEmptyTap }) {
  useMapEvents({
    click(e) {
      const target = e.originalEvent?.target;
      const hitInteractiveLayer =
        target instanceof Element && target.closest(".leaflet-marker-icon, .leaflet-interactive");
      if (!hitInteractiveLayer) onEmptyTap(e.latlng);
    },
  });
  return null;
}
