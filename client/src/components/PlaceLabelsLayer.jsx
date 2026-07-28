import { useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { createPlaceLabelIcon } from "../lib/mapIcons.jsx";
import { CATEGORY_TIER, poiTierForZoom } from "../lib/poiTiers.js";

// Zoom-tier system for locality labels (villages/suburbs/neighbourhoods/
// hamlets from the `places` gazetteer — see usePlaces.js), following the
// same named-zoom-constant + type-tier-map + tierForZoom() pattern already
// established in lib/poiTiers.js. Kept local to this file rather than added
// to that shared module: poiTiers.js is explicitly the sync point for POI
// *pins* (schools/hospitals/restaurants/...), and places are a different
// dataset (localities, not venues) with no need to stay in lockstep with POI
// reveal zooms.
//
// 'town' is included at the same earliest tier as village/suburb — it used
// to be deliberately excluded (CARTO's own dark-labels tile overlay already
// prints Chitwan's town-tier names, so this looked like it would double up
// the most prominent names on the map), but that CARTO label renders
// whatever OSM's primary `name` tag is, which for Chitwan is Devanagari
// script, not English — confirmed live (e.g. "Ratnanagar" showed as
// "रत्ननगर" on the base tiles). Leaving town names to CARTO meant the most
// prominent places on the map were the only ones NOT in English. Since our
// markers render in Leaflet's marker pane, which always paints above the
// tile panes CARTO's overlay lives in, our English label now simply sits on
// top of (and visually replaces) CARTO's smaller Devanagari one wherever
// they'd coincide — no removal of that tile layer needed, still keeps its
// road/river labels intact.
const PLACE_TIER_1_ZOOM = 12; // city, town, village, suburb — visible close to the default district-wide view
const PLACE_TIER_2_ZOOM = 14; // neighbourhood, hamlet — only once zoomed in further

const PLACE_TYPE_TIER = {
  city: 1,
  town: 1,
  village: 1,
  suburb: 1,
  neighbourhood: 2,
  hamlet: 2,
};

function placeTierForZoom(zoom) {
  if (zoom >= PLACE_TIER_2_ZOOM) return 2;
  if (zoom >= PLACE_TIER_1_ZOOM) return 1;
  return 0;
}

// Drawn below flat chips and POI pins in z-order (see zIndexOffset on the
// Marker below) so that WHEN a label and another marker do land on the same
// spot, that marker wins the paint order instead of a label rendering
// illegibly on top of it — but that only controls which one wins if they
// collide, it doesn't stop them from colliding in the first place. A chip or
// POI pin drawn over a label just hides the label instead. So decluttering
// has to know about flat chip/cluster and POI pin positions too, not just
// other labels — see approximateFlatOccupiedZones/approximatePoiOccupiedZones
// below.
//
// Collision uses each label's actual estimated text width, not a flat
// point-to-point radius — a fixed radius (what this used to be) breaks down
// for text: two moderate-length names like "Gitanagar" and "Shivanagar" can
// sit just past a fixed 90px center-to-center threshold and still visually
// overlap, since each one's rendered text extends outward from its own
// center by roughly half its own width, and that half-width can exceed what
// a uniform radius assumed. Treating each label as a small rectangle and
// checking for actual rectangle overlap (with padding) is correct regardless
// of how long any individual name is.
const AVG_CHAR_WIDTH_PX = 7; // rough estimate for the 12px/weight-700 label font
// No background box anymore (see createPlaceLabelIcon) — this is just a
// small allowance for the text-shadow "outline"'s own blur radius, which
// extends a couple px past the glyphs themselves.
const LABEL_HALO_PX = 3;
const LABEL_HEIGHT_PX = 15 + LABEL_HALO_PX * 2;
// Minimum breathing room enforced between two boxes — deliberately larger
// than the couple of px true visual breathing room needs, since every width
// figure feeding into this (label text, POI pin+label, flat chip) is itself
// an estimate, not a real measurement. The margin absorbs that slop so an
// unusually long name (POIs in particular can run 25-40 characters) doesn't
// slip through as "far enough apart" when its real rendered width is a bit
// wider than the character-count estimate assumed.
const LABEL_PADDING_PX = 22;

function estimatedLabelWidth(name) {
  return name.length * AVG_CHAR_WIDTH_PX + LABEL_HALO_PX * 2;
}

// FlatsLayer clusters flats within 60px of each other into one chip
// (maxClusterRadius, see FlatsLayer.jsx) — mirroring that same radius here
// (rather than treating every individual flat as its own separate obstacle)
// means a dense pocket of 30 flats collapses into the one avoided zone that
// will actually render there, instead of 30 overlapping ones that would
// make labels impossible to place anywhere near a busy area. This is a
// rough approximation, not a re-implementation of the clustering library —
// good enough to steer labels away from where a chip will visually land,
// not a pixel-exact prediction of react-leaflet-cluster's own centroid math.
const FLAT_CLUSTER_RADIUS_PX = 60;
// Rough width of a single/cluster flat chip (createFlatInfoChipIcon's "base"
// tier anchors at x=44, i.e. ~88px wide; createClusterBadgeIcon has a 60px
// minWidth plus padding) — close enough for spacing purposes.
const FLAT_ZONE_WIDTH_PX = 90;

function approximateFlatOccupiedZones(flats, map, zoom) {
  const points = flats.map((f) => map.project([f.lat, f.lng], zoom));
  const used = new Array(points.length).fill(false);
  const zones = [];

  for (let i = 0; i < points.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let sumX = points[i].x;
    let sumY = points[i].y;
    let count = 1;
    for (let j = i + 1; j < points.length; j++) {
      if (used[j]) continue;
      if (Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y) < FLAT_CLUSTER_RADIUS_PX) {
        sumX += points[j].x;
        sumY += points[j].y;
        count++;
        used[j] = true;
      }
    }
    zones.push({ x: sumX / count, y: sumY / count, width: FLAT_ZONE_WIDTH_PX });
  }

  return zones;
}

// POI pin + label width (createLabeledPoiIcon: ~20px pin + 4px gap + text) —
// POIs don't cluster the way flats do (GeneralPoisLayer/PoisLayer render
// every POI that passes their own tier check as its own marker, already
// spatially thinned by their own 55px-spacing declutter pass), so each one
// is its own zone rather than merged like flat chips are.
const POI_ICON_WIDTH_PX = 26;

function estimatedPoiZoneWidth(name) {
  return POI_ICON_WIDTH_PX + name.length * AVG_CHAR_WIDTH_PX;
}

// Mirrors PoisLayer.jsx's own visiblePois predicate (schools render at any
// zoom; everything else — including college, which is NOT exempt — needs
// its category's tier reached) so the estimate of "what's actually on
// screen right now" stays consistent with what that layer, and
// GeneralPoisLayer, really render — not just an approximation good enough to
// look plausible.
function approximatePoiOccupiedZones(pois, map, zoom) {
  const activeTier = poiTierForZoom(zoom);
  return pois
    .filter((p) => p.category === "school" || (activeTier > 0 && (CATEGORY_TIER[p.category] ?? 5) <= activeTier))
    .map((p) => {
      const point = map.project([p.lat, p.lng], zoom);
      return { x: point.x, y: point.y, width: estimatedPoiZoneWidth(p.name) };
    });
}

// Grid cell size for the spatial-bucket optimization below — generous enough
// that even the longest realistic place name (~30 chars, ~200px) plus
// another label's width plus padding still falls inside the 3x3 neighborhood
// scanned per candidate, so bucketing can't hide a real overlap.
const GRID_CELL_PX = 260;

function declutterPlaces(places, occupiedZones, map, zoom) {
  const sorted = [...places].sort(
    (a, b) => (PLACE_TYPE_TIER[a.place_type] ?? 9) - (PLACE_TYPE_TIER[b.place_type] ?? 9)
  );

  const grid = new Map(); // "cellX,cellY" -> [{x,y,width}]
  const kept = [];

  const addToGrid = (entry) => {
    const cellX = Math.floor(entry.x / GRID_CELL_PX);
    const cellY = Math.floor(entry.y / GRID_CELL_PX);
    const key = `${cellX},${cellY}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(entry);
  };

  // Pre-seed with flat chip/cluster and POI pin zones so labels steer clear
  // of them from the start, exactly as if they were already-kept labels of
  // infinite priority — flats and POIs always win a collision, never the
  // other way around.
  for (const zone of occupiedZones) addToGrid(zone);

  for (const place of sorted) {
    const point = map.project([place.lat, place.lng], zoom);
    const width = estimatedLabelWidth(place.name);
    const cellX = Math.floor(point.x / GRID_CELL_PX);
    const cellY = Math.floor(point.y / GRID_CELL_PX);

    let tooClose = false;
    for (let dx = -1; dx <= 1 && !tooClose; dx++) {
      for (let dy = -1; dy <= 1 && !tooClose; dy++) {
        const bucket = grid.get(`${cellX + dx},${cellY + dy}`);
        if (!bucket) continue;
        for (const other of bucket) {
          const overlapsX = Math.abs(point.x - other.x) < (width + other.width) / 2 + LABEL_PADDING_PX;
          const overlapsY = Math.abs(point.y - other.y) < LABEL_HEIGHT_PX + LABEL_PADDING_PX;
          if (overlapsX && overlapsY) {
            tooClose = true;
            break;
          }
        }
      }
    }
    if (tooClose) continue;

    addToGrid({ x: point.x, y: point.y, width });
    kept.push(place);
  }

  return kept;
}

export default function PlaceLabelsLayer({ places, flats = [], pois = [] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const activeTier = placeTierForZoom(zoom);

  // Every place whose type's tier has been reached is a candidate — 'town'
  // rows never match (PLACE_TYPE_TIER has no entry for them, so they fall
  // back to 9 and never pass the <= activeTier check below).
  const visiblePlaces = useMemo(
    () => (activeTier === 0 ? [] : places.filter((p) => (PLACE_TYPE_TIER[p.place_type] ?? 9) <= activeTier)),
    [places, activeTier]
  );

  const occupiedZones = useMemo(() => {
    const flatZones = approximateFlatOccupiedZones(flats, map, zoom);
    const poiZones = approximatePoiOccupiedZones(pois, map, zoom);
    return [...flatZones, ...poiZones];
  }, [flats, pois, map, zoom]);

  const declutteredPlaces = useMemo(
    () => declutterPlaces(visiblePlaces, occupiedZones, map, zoom),
    [visiblePlaces, occupiedZones, map, zoom]
  );

  const icons = useMemo(
    () => Object.fromEntries(declutteredPlaces.map((p) => [p.id, createPlaceLabelIcon(p.name)])),
    [declutteredPlaces]
  );

  return (
    <>
      {declutteredPlaces.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={icons[place.id]}
          interactive={false}
          // Forces these below flat chips/POI pins/etc. regardless of
          // Leaflet's default latitude-based auto z-index, matching the
          // "drawn underneath the flat chips" requirement without needing a
          // dedicated pane.
          zIndexOffset={-1000}
        />
      ))}
    </>
  );
}
