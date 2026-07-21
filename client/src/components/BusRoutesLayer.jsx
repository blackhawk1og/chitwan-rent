import { Polyline, Tooltip } from "react-leaflet";

export default function BusRoutesLayer({ routes }) {
  return (
    <>
      {routes.map((route) => {
        const positions = (route.geojson?.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng]);
        return (
          <Polyline
            key={route.id}
            positions={positions}
            pathOptions={{ color: route.color, weight: 4, opacity: 0.85 }}
          >
            <Tooltip sticky>{route.name}</Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
