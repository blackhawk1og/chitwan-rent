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

// Classic teardrop map-pin silhouette (wide circular top, tapering to a
// point) shared by both POI marker variants below — the point is what
// anchors to the actual lat/lng, not the shape's visual center, so every
// caller must set iconAnchor to the pin's tip, not its midpoint. Fill stays
// a fixed dark surface color (matches the app's existing dark theme);
// per-category color-coding now lives on the ring/stroke instead of the
// fill, since the fill is no longer a solid category-colored circle.
const POI_PIN_PATH =
  "M12 32C12 32 22 18.5 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 18.5 12 32 12 32Z";
const POI_PIN_FILL = "#1a1b2e";
// Fraction of the pin's own height/width occupied by the circular top
// portion (the rest tapers into the point) — used to center the icon glyph
// inside that circle rather than the whole (taller) pin shape.
const POI_PIN_HEAD_TOP = 0.0625;
const POI_PIN_HEAD_HEIGHT = 0.625;

function poiPinSvg(width, height, ringColor) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 32" style={{ position: "absolute", top: 0, left: 0 }}>
      <path d={POI_PIN_PATH} fill={POI_PIN_FILL} stroke={ringColor} strokeWidth="2" />
    </svg>
  );
}

// Icon-only teardrop pin — used for POI markers below the label-reveal zoom
// threshold. Not to be confused with createDotIcon: that one is shared by
// non-POI markers (seeker pins, draft pins, to-let spots) and must keep its
// plain circular shape, so POI markers get their own dedicated pin shape here.
export function createPoiPinIcon(IconComponent, { bg = "#38bdf8", size = 28 } = {}) {
  const width = size;
  const height = Math.round(size * (32 / 24));

  const html = renderToStaticMarkup(
    <div style={{ position: "relative", width, height }}>
      {poiPinSvg(width, height, bg)}
      <div
        style={{
          position: "absolute",
          top: height * POI_PIN_HEAD_TOP,
          left: 0,
          width,
          height: height * POI_PIN_HEAD_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={size * 0.45} color="#ffffff" />
      </div>
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: [width, height],
    // Bottom tip, not the shape's center — see POI_PIN_PATH comment above.
    iconAnchor: [width / 2, height],
  });
}

// Small teardrop pin + text label, baked into one marker — used for POIs
// (schools/colleges, general POIs) once zoomed in far enough to show names.
export function createLabeledPoiIcon(IconComponent, label, { bg = "#38bdf8" } = {}) {
  const pinWidth = 20;
  const pinHeight = Math.round(pinWidth * (32 / 24));

  const html = renderToStaticMarkup(
    // flex-end (not center) so the pin's tip and the label's baseline sit on
    // the same line — the pin, being the taller child, then determines the
    // whole row's height, keeping the iconAnchor math below exact.
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
      <div style={{ position: "relative", width: pinWidth, height: pinHeight, flexShrink: 0 }}>
        {poiPinSvg(pinWidth, pinHeight, bg)}
        <div
          style={{
            position: "absolute",
            top: pinHeight * POI_PIN_HEAD_TOP,
            left: 0,
            width: pinWidth,
            height: pinHeight * POI_PIN_HEAD_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconComponent size={pinWidth * 0.5} color="#ffffff" />
        </div>
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
    // Pin's bottom tip: x = pin's own horizontal center, y = the row's full
    // height (the pin is the tallest child under align-items: flex-end, so
    // its bottom already sits at the row's bottom edge).
    iconAnchor: [pinWidth / 2, pinHeight],
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
