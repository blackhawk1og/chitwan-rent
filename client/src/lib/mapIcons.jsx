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
// "light" (the flat-count badge) renders as a dark, semi-transparent glass
// card — matches the map's own night theme instead of sitting on top of it
// as a bright white sticker. "teal" (the seeker-count badge) already reads
// as part of the map and keeps its original solid-color styling untouched.
export function createClusterBadgeIcon({ line1, line2, tone = "light" }) {
  const isLight = tone === "light";
  const bg = isLight ? "rgba(21,22,38,0.92)" : "rgba(20,184,166,0.97)";
  const line1Color = isLight ? "#f5f5f7" : "#ffffff";
  const line2Color = isLight ? "#9ca3af" : "rgba(255,255,255,0.85)";
  const border = isLight ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.06)";
  const boxShadow = isLight
    ? "0 4px 14px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)"
    : "0 4px 14px rgba(0,0,0,0.45)";

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
        boxShadow,
        border,
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
// caller must set iconAnchor to the pin's tip, not its midpoint. Matches
// Google Maps' own POI pin convention: a plain WHITE outer pin with a
// category-colored circular badge centered in its head, and the icon
// glyph in white on top of that badge — not a fully category-colored pin.
const POI_PIN_PATH =
  "M12 32C12 32 22 18.5 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 18.5 12 32 12 32Z";
// Fraction of the pin's own height/width occupied by the circular top
// portion (the rest tapers into the point) — used to center the icon glyph
// inside that circle rather than the whole (taller) pin shape.
const POI_PIN_HEAD_TOP = 0.0625;
const POI_PIN_HEAD_HEIGHT = 0.625;
// Inner colored-badge circle, in the same 24x32 viewBox as POI_PIN_PATH —
// centered in the pin's head, smaller than the head itself so a visible
// white ring remains around it (matches the reference "H" hospital pin).
const POI_BADGE_CENTER = { x: 12, y: 12 };
const POI_BADGE_RADIUS = 7.5;

// glow=true swaps the pin's static drop-shadow for a 2-blink glow animation
// (pin-glow-blink, see tailwind.config.js) — filter-based rather than
// box-shadow so it hugs the teardrop silhouette instead of drawing a
// rectangular glow around the icon's bounding box. Used to draw attention to
// pins that just appeared (e.g. right when a POI layer is switched on).
function poiPinSvg(width, height, badgeColor, glow = false) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 32"
      className={glow ? "animate-pin-glow-blink" : undefined}
      // z-index:0 is deliberate, not decorative: `filter` makes this SVG
      // establish its own stacking context, which left to "auto" can paint
      // ambiguously against a later position:absolute sibling with no
      // stacking context of its own (the icon glyph layer below) — that's
      // what was making category glyphs like the hospital "H" invisible.
      // Pinning explicit z-index on both this and the glyph layer removes
      // the ambiguity outright.
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.55))",
      }}
    >
      <path d={POI_PIN_PATH} fill="#ffffff" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      <circle cx={POI_BADGE_CENTER.x} cy={POI_BADGE_CENTER.y} r={POI_BADGE_RADIUS} fill={badgeColor} />
    </svg>
  );
}

// Icon-only teardrop pin — used for POI markers below the label-reveal zoom
// threshold. Not to be confused with createDotIcon: that one is shared by
// non-POI markers (seeker pins, draft pins, to-let spots) and must keep its
// plain circular shape, so POI markers get their own dedicated pin shape here.
// `IconComponent` is a white glyph on a colored badge circle — matches
// Google Maps' own POI pin convention (see the module comment above
// POI_PIN_PATH). Every pin is a fixed 30x32 (not proportional to some
// caller-supplied size) — one consistent pin size across every POI category.
export function createPoiPinIcon(IconComponent, { bg = "#38bdf8", glow = false } = {}) {
  const width = 30;
  const height = 32;

  const html = renderToStaticMarkup(
    <div style={{ position: "relative", width, height }}>
      {poiPinSvg(width, height, bg, glow)}
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
          zIndex: 1,
        }}
      >
        <IconComponent size={width * 0.4} color="#ffffff" />
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
export function createLabeledPoiIcon(IconComponent, label, { bg = "#38bdf8", glow = false } = {}) {
  const pinWidth = 30;
  const pinHeight = 32;

  const html = renderToStaticMarkup(
    // flex-end (not center) so the pin's tip and the label's baseline sit on
    // the same line — the pin, being the taller child, then determines the
    // whole row's height, keeping the iconAnchor math below exact.
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
      <div style={{ position: "relative", width: pinWidth, height: pinHeight, flexShrink: 0 }}>
        {poiPinSvg(pinWidth, pinHeight, bg, glow)}
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
            zIndex: 1,
          }}
        >
          <IconComponent size={pinWidth * 0.4} color="#ffffff" />
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

// Plain text label for a locality name (village/town/suburb/neighbourhood/
// hamlet) — no icon glyph, no pin shape, just a name floating directly over
// its point, the way Google Maps prints place names with no marker attached.
// Built on the same zero-size anchor-box trick as createYourPinIcon below,
// generalized to center on both axes (translate -50%/-50%) rather than sit
// above a fixed point, since a bare label centers ON its coordinate instead
// of anchoring from an edge.
// pointer-events:none here is load-bearing, not decorative — this layer
// renders as regular markers stacked with everything else on the map, and a
// label must never steal a tap meant for the map background underneath it
// (PinDropCatcher/EmptyTapCatcher) or a flat chip it happens to overlap.
//
// A frosted-glass backdrop-blur pill briefly replaced this bare-text
// treatment, then got reverted — backdrop-filter has to keep re-sampling
// whatever's underneath it on every frame, and Leaflet transforms markers
// continuously during its zoom animation, so the two together made zoom
// transitions visibly smear/lag. Bare text with a strong multi-directional
// shadow "outline" has no such cost (text-shadow is cheap, no live
// background sampling) and still reads clearly over the dark/satellite
// tiles, road lines, and CARTO's own label overlay underneath.
export function createPlaceLabelIcon(name) {
  const html = renderToStaticMarkup(
    <div style={{ position: "relative", width: 0, height: 0 }}>
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "translate(-50%, -50%)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.2,
          color: "#ffffff",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          textShadow:
            "-1.5px -1.5px 2.5px rgba(0,0,0,0.9), 1.5px -1.5px 2.5px rgba(0,0,0,0.9), -1.5px 1.5px 2.5px rgba(0,0,0,0.9), 1.5px 1.5px 2.5px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.75)",
        }}
      >
        {name}
      </span>
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-place-label",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Solid-fill teardrop with a small white "punch-hole" near the top — the
// classic Google Maps search-result pin silhouette, deliberately different
// from the POI pins above (white body + small colored badge) so a picked
// search result never reads as just another POI category. Reuses the same
// 24x32 pin geometry (POI_PIN_PATH/POI_BADGE_CENTER) and the exact
// label-beside-pin layout createLabeledPoiIcon uses (flex row, align-items:
// flex-end, iconAnchor = [pinWidth/2, pinHeight]) so the tip still anchors
// correctly to the real lat/lng regardless of the label's width. Pink is
// unused by every other marker/chip on the map (education is purple, medical
// is red, food is orange, landmarks are green, temples are gray, gated/
// user-location/your-pin are blue, the find-a-flat draft pin is teal) so this
// always reads as visually distinct.
const SEARCH_PIN_COLOR = "#E91E63";

// Marker dropped at a selected search result (local gazetteer or Nominatim
// fallback — both resolve to the same {label, lat, lng} shape in
// SearchBar.jsx, so one icon factory covers both). `label` is optional so a
// bare pin can still be requested without a caption.
export function createSearchResultPinIcon(label) {
  const pinWidth = 30;
  const pinHeight = 32;

  const html = renderToStaticMarkup(
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
      <svg
        width={pinWidth}
        height={pinHeight}
        viewBox="0 0 24 32"
        style={{ flexShrink: 0, filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.6))" }}
      >
        <path d={POI_PIN_PATH} fill={SEARCH_PIN_COLOR} stroke="#ffffff" strokeWidth="1.5" />
        <circle cx={POI_BADGE_CENTER.x} cy={POI_BADGE_CENTER.y} r={4} fill="#ffffff" />
      </svg>
      {label && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            background: "rgba(11,12,23,0.85)",
            padding: "2px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: null,
    // Pin's bottom tip, same reasoning as createLabeledPoiIcon: flex-end
    // aligns the taller pin's own bottom to the row's bottom edge, so the
    // label beside it doesn't shift the anchor point.
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

// Small red pill stacked above a reported flat's chip — see createFlatInfoChipIcon.
const REPORT_BADGE_HEIGHT_PX = 20;
const REPORT_BADGE_GAP_PX = 4;

// Compact info chip for an individual flat pin: "3BHK · 29.2K · ★ 4.0" in one row.
// When reportCount > 0, a small red "N report(s)" pill stacks directly above
// the chip — baked into the same divIcon (rather than a second Marker) so it
// always moves/z-orders together with the chip it belongs to. The extra
// height only shifts iconAnchor, not the chip's own layout, so the chip
// itself is pixel-identical to the no-reports case.
export function createFlatInfoChipIcon({ bhk, rent, rating, gated, sizeTier = "base", reportCount = 0 }) {
  const bhkLabel = bhk >= 5 ? "5+" : bhk;
  const priceLabel = `${(rent / 1000).toFixed(1)}K`;
  const ratingLabel = rating != null ? Number(rating).toFixed(1) : "—";
  const background = GATED_CHIP_BG[gated] ?? "rgba(17,18,32,0.96)";
  const s = CHIP_SIZE_STYLES[sizeTier] ?? CHIP_SIZE_STYLES.base;
  const hasReports = reportCount > 0;

  const divider = (
    <span style={{ width: 1, height: s.dividerH, background: "rgba(255,255,255,0.18)", flexShrink: 0 }} />
  );

  const chip = (
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

  const html = renderToStaticMarkup(
    hasReports ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: REPORT_BADGE_GAP_PX }}>
        <span
          style={{
            fontSize: Math.max(s.fontSize - 0.5, 8),
            fontWeight: 800,
            color: "#ffffff",
            background: "#dc2626",
            padding: "2px 8px",
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.25)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {reportCount} report{reportCount === 1 ? "" : "s"}
        </span>
        {chip}
      </div>
    ) : (
      chip
    )
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: null,
    iconAnchor: [s.anchorX, hasReports ? s.anchorY + REPORT_BADGE_HEIGHT_PX + REPORT_BADGE_GAP_PX : s.anchorY],
  });
}

// "Your Pin" marker shown during the List My Flat post-submit steps
// (branch choice / final details / success) — a small dark "Your Pin" label
// stacked above a blue "1BHK · 10K" chip with a pointed tail, replacing the
// plain draggable draft-pin dot once the location itself is no longer
// adjustable. Built on a zero-size anchor box with the content absolutely
// centered over it (translateX(-50%)), since the label/chip's width varies
// with content and can't be known ahead of a fixed iconAnchor.
export function createYourPinIcon({ bhkText, rentText }) {
  const html = renderToStaticMarkup(
    <div style={{ position: "relative", width: 0, height: 0 }}>
      <div
        style={{
          position: "absolute",
          bottom: 7,
          left: 0,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            background: "#1a1b2e",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 6,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          Your Pin
        </span>
        <span
          style={{
            background: "#3b82f6",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 800,
            padding: "6px 13px",
            borderRadius: 9999,
            boxShadow: "0 3px 8px rgba(0,0,0,0.45)",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {bhkText} · {rentText}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "6px solid #3b82f6",
        }}
      />
    </div>
  );

  return L.divIcon({
    html,
    className: "chitwan-pin-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
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
