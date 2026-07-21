import { Marker, Popup } from "react-leaflet";
import { Mail } from "lucide-react";
import { createDotIcon } from "../lib/mapIcons.jsx";

const toletIcon = createDotIcon(Mail, { bg: "#f59e0b", size: 24 });

export default function ToletSpotsLayer({ spots }) {
  return (
    <>
      {spots.map((spot) => (
        <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={toletIcon}>
          <Popup>
            <div className="text-sm">
              <div className="font-bold">{spot.name || "A rental hero"}</div>
              {spot.message && <div className="mt-1 text-gray-600">{spot.message}</div>}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
