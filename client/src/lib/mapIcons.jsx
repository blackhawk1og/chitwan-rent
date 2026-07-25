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

// Circular icon-button cluster badge — matches the on-map toggle-icon visual
// language (see IconStack's StackButton "active" state) rather than the
// flat/seeker text-pill cluster style, since POI markers are icon-based
// rather than text chips. An optional small secondaryIcon renders as a
// combined badge on the circle itself (e.g. an open-book icon layered onto
// the graduation cap for schools, so the cluster reads as "multiple" rather
// than looking identical to a single POI marker); the count always renders
// as a small notification-style chip in the top-right corner.
export function createPoiClusterIcon(IconComponent, count, { secondaryIcon: SecondaryIcon } = {}) {
  const size = 35;
  const html = renderToStaticMarkup(
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "9999px",
          background: "#7c3aed",
          border: "0px solid rgba(255,255,255,0.9)",
          boxShadow: "0 3px 10px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={19} color="#ffffff" strokeWidth={2.2} />
      </div>

      {SecondaryIcon && (
        <div
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: 16,
            height: 16,
            borderRadius: "9999px",
            background: "#7c3aed",
            border: "1px solid #0b0c17",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SecondaryIcon size={9} color="#ffffff" strokeWidth={2.5} />
        </div>
      )}

      <span
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          minWidth: 20,
          height: 20,
          padding: "0 5px",
          borderRadius: "9999px",
          background: "#ffffff",
          color: "#7c3aed",
          fontSize: 11,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #0b0c17",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {count}
      </span>
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-cluster-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

// Marker background by gated status: blue for gated societies, orange for
// not gated. Falls back to the neutral dark chip when gated status is unset.
const GATED_CHIP_BG = {
  gated: "#3b82f6",
  not_gated: "#f59e0b",
};

// Sizing presets for createFlatInfoChipIcon. "base" is the resting compact
// style shown as soon as individual (unclustered) chips appear; "compact"
// and "tight" shrink it further as the user zooms in past the thresholds in
// FlatsLayer's FLAT_CHIP_ZOOM_SCALE, so dense close-up views stay tidy
// instead of every chip staying full-size.
const CHIP_SIZE_STYLES = {
  base: { padY: 4, padX: 8, gap: 5, fontSize: 10, dividerH: 10, anchorX: 44, anchorY: 11 },
  compact: { padY: 3.5, padX: 7, gap: 4, fontSize: 9.5, dividerH: 9, anchorX: 40, anchorY: 10 },
  tight: { padY: 3, padX: 6, gap: 4, fontSize: 9, dividerH: 8, anchorX: 36, anchorY: 9 },
};

// Compact info chip for an individual flat pin: "3BHK · 29.2K · ★ 4.0" in one row.
export function createFlatInfoChipIcon({ bhk, rent, rating, gated, sizeTier = "base" }) {
  const bhkLabel = bhk >= 5 ? "5+" : bhk;
  const priceLabel = `${(rent / 1000).toFixed(1)}K`;
  const ratingLabel = rating != null ? Number(rating).toFixed(1) : "—";
  const background = GATED_CHIP_BG[gated] ?? "rgba(17,18,32,0.96)";
  const s = CHIP_SIZE_STYLES[sizeTier] ?? CHIP_SIZE_STYLES.base;

  const divider = (
    <span style={{ width: 1, height: s.dividerH, background: "rgba(255,255,255,0.18)", flexShrink: 0 }} />
  );

  const html = renderToStaticMarkup(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: s.gap,
        padding: `${s.padY}px ${s.padX}px`,
        borderRadius: 9999,
        background,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.45)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: s.fontSize, fontWeight: 800, color: "#ffffff" }}>{bhkLabel}BHK</span>
      {divider}
      <span style={{ fontSize: s.fontSize, fontWeight: 800, color: "#ffffff" }}>{priceLabel}</span>
      {divider}
      <span style={{ fontSize: s.fontSize, fontWeight: 800, color: "#facc15" }}>★ {ratingLabel}</span>
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: null,
    iconAnchor: [s.anchorX, s.anchorY],
  });
}

// "You are here" marker for Locate Me: a solid blue dot with a white ring
// and a soft pulsing accuracy halo — the conventional browser-geolocation
// look, kept deliberately distinct from every other marker type on the map.
export function createUserLocationIcon() {
  const html = renderToStaticMarkup(
    <div
      style={{
        position: "relative",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        className="animate-locate-pulse"
        style={{
          position: "absolute",
          width: 26,
          height: 26,
          borderRadius: "9999px",
          background: "rgba(59,130,246,0.5)",
        }}
      />
      <span
        style={{
          position: "relative",
          width: 14,
          height: 14,
          borderRadius: "9999px",
          background: "#3b82f6",
          border: "2.5px solid #ffffff",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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
