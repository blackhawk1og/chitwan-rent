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

// Small icon + text label, baked into one marker — used for POIs (schools/colleges).
export function createLabeledPoiIcon(IconComponent, label, { bg = "#38bdf8" } = {}) {
  const html = renderToStaticMarkup(
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          borderRadius: "9999px",
          background: bg,
          border: "2px solid white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={11} color="white" strokeWidth={2.5} />
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          background: "rgba(11,12,23,0.75)",
          padding: "1px 6px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: null,
    iconAnchor: [10, 10],
  });
}

// Compact info chip for an individual flat pin: "3BHK · 29.2K · ★ 4.0" in one row.
export function createFlatInfoChipIcon({ bhk, rent, rating }) {
  const bhkLabel = bhk >= 5 ? "5+" : bhk;
  const priceLabel = `${(rent / 1000).toFixed(1)}K`;
  const ratingLabel = rating != null ? Number(rating).toFixed(1) : "—";

  const divider = (
    <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.18)", flexShrink: 0 }} />
  );

  const html = renderToStaticMarkup(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 9999,
        background: "rgba(17,18,32,0.96)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.45)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, color: "#ffffff" }}>{bhkLabel}BHK</span>
      {divider}
      <span style={{ fontSize: 11, fontWeight: 800, color: "#ffffff" }}>{priceLabel}</span>
      {divider}
      <span style={{ fontSize: 11, fontWeight: 800, color: "#facc15" }}>★ {ratingLabel}</span>
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: null,
    iconAnchor: [50, 14],
  });
}

// White circular drag handle for the Area Stats rectangle's corners.
export function createHandleIcon() {
  const html = renderToStaticMarkup(
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: "9999px",
        background: "#ffffff",
        border: "2px solid #7c3aed",
        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
      }}
    />
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
