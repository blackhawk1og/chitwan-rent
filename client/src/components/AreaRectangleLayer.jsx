import { useMemo } from "react";
import { Rectangle, Marker } from "react-leaflet";
import { createHandleIcon } from "../lib/mapIcons.jsx";

const handleIcon = createHandleIcon();

export default function AreaRectangleLayer({ bounds, onCornerDrag }) {
  const { north, south, east, west } = bounds;

  const corners = useMemo(
    () => ({
      nw: { lat: north, lng: west },
      ne: { lat: north, lng: east },
      sw: { lat: south, lng: west },
      se: { lat: south, lng: east },
    }),
    [north, south, east, west]
  );

  return (
    <>
      <Rectangle
        bounds={[
          [south, west],
          [north, east],
        ]}
        pathOptions={{ color: "#7c3aed", weight: 2, fillOpacity: 0.12 }}
      />
      {Object.entries(corners).map(([key, pos]) => (
        <Marker
          key={key}
          position={[pos.lat, pos.lng]}
          icon={handleIcon}
          draggable
          eventHandlers={{ dragend: (e) => onCornerDrag(key, e.target.getLatLng()) }}
        />
      ))}
    </>
  );
}
