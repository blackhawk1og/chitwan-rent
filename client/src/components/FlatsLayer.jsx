import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { createFlatInfoChipIcon, createClusterBadgeIcon } from "../lib/mapIcons.jsx";
import { createClusterClickHandler } from "../lib/clusterBehavior.js";

// Zoom thresholds for progressively shrinking the flat info chip as the user
// zooms in further — named/centralized here so they're easy to retune after
// visual testing, same convention as other zoom-tiered map layers.
export const FLAT_CHIP_ZOOM_SCALE = {
  compact: 16, // first size-down step
  tight: 18, // second size-down step
};

function chipSizeTier(zoom) {
  if (zoom >= FLAT_CHIP_ZOOM_SCALE.tight) return "tight";
  if (zoom >= FLAT_CHIP_ZOOM_SCALE.compact) return "compact";
  return "base";
}

export default function FlatsLayer({ flats, onSelect, onNearbyCluster }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const clusterRef = useRef(null);

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  // Flats at (near-)identical coordinates can never be split apart by
  // zooming further, so their cluster shows NearbyFlatsModal (via
  // onNearbyCluster) instead of spiderfying — see clusterBehavior.js.
  // Genuinely splittable clusters still zoom in smoothly on click, same as
  // the library's own default behavior otherwise would.
  useEffect(() => {
    const group = clusterRef.current;
    if (!group) return;

    const handleClusterClick = createClusterClickHandler({
      onNeverSplitCluster: (markers) => {
        const clusterFlats = markers.map((m) => m.__flatData).filter(Boolean);
        if (clusterFlats.length) onNearbyCluster(clusterFlats);
      },
    });

    group.off("clusterclick clusterkeypress", group._zoomOrSpiderfy, group);
    group.on("clusterclick clusterkeypress", handleClusterClick, group);

    return () => {
      group.off("clusterclick clusterkeypress", handleClusterClick, group);
      group.on("clusterclick clusterkeypress", group._zoomOrSpiderfy, group);
    };
  }, [onNearbyCluster]);

  const sizeTier = chipSizeTier(zoom);

  const iconCreateFunction = useMemo(
    () => (cluster) => {
      const count = cluster.getChildCount();
      return createClusterBadgeIcon({
        line1: `${count} flat${count === 1 ? "" : "s"}`,
        line2: `AVLB ${count}`,
        tone: "light",
      });
    },
    []
  );

  const icons = useMemo(
    () =>
      Object.fromEntries(
        flats.map((flat) => [
          flat.id,
          createFlatInfoChipIcon({
            bhk: flat.bhk,
            rent: flat.rent,
            // Seed/dummy flats never show a rating on the marker either —
            // same is_seed rule as FlatDetailPanel's Community Rating
            // section. Passing null (rather than flat.rating) reuses
            // createFlatInfoChipIcon's existing `rating != null` guard, no
            // change needed there.
            rating: flat.is_seed ? null : flat.rating,
            gated: flat.gated,
            listingType: flat.listing_type,
            sizeTier,
            reportCount: flat.report_count,
          }),
        ])
      ),
    [flats, sizeTier]
  );

  return (
    <MarkerClusterGroup
      ref={clusterRef}
      iconCreateFunction={iconCreateFunction}
      maxClusterRadius={60}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
    >
      {flats.map((flat) => (
        <Marker
          key={flat.id}
          position={[flat.lat, flat.lng]}
          icon={icons[flat.id]}
          eventHandlers={{ click: () => onSelect(flat) }}
          // Stashed directly on the marker instance so the generic cluster
          // click handler (clusterBehavior.js) can read back which flat
          // each spiderfied-alternative marker belongs to, without that
          // shared/data-agnostic module needing to know about flats.
          ref={(marker) => {
            if (marker) marker.__flatData = flat;
          }}
        />
      ))}
    </MarkerClusterGroup>
  );
}
