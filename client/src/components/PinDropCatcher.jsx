import { useMapEvents } from "react-leaflet";

export default function PinDropCatcher({ onPlace }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng);
    },
  });
  return null;
}
