import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";

// Small colored dot/home-style pin used for individual (non-clustered) markers.
export function createDotIcon(IconComponent, { bg = "#7c3aed", size = 28 } = {}) {
  const html = renderToStaticMarkup(
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: bg,
        border: "2px solid white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <IconComponent size={size * 0.5} color="white" strokeWidth={2.5} />
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Two-line cluster badge: bold count on top, smaller muted subtext below.
export function createClusterBadgeIcon({ line1, line2, tone = "light" }) {
  const isLight = tone === "light";
  const bg = isLight ? "rgba(255,255,255,0.97)" : "rgba(20,184,166,0.97)";
  const line1Color = isLight ? "#111827" : "#ffffff";
  const line2Color = isLight ? "#6b7280" : "rgba(255,255,255,0.85)";

  const html = renderToStaticMarkup(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 60,
        padding: "6px 12px",
        borderRadius: 16,
        background: bg,
        boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
        border: "1px solid rgba(0,0,0,0.06)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 800, color: line1Color, lineHeight: 1.2, whiteSpace: "nowrap" }}>
        {line1}
      </span>
      {line2 && (
        <span style={{ fontSize: 10, fontWeight: 700, color: line2Color, lineHeight: 1.2, whiteSpace: "nowrap" }}>
          {line2}
        </span>
      )}
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-cluster-icon",
    iconSize: null,
  });
}
