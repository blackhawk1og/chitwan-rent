// How long a cluster-click zoom-in should glide for, regardless of how many
// zoom levels it covers — see zoomToBoundsSmoothly below for why this can't
// just be a longer CSS transition.
const CLUSTER_ZOOM_DURATION_SECONDS = 1.0;

// cluster.zoomToBounds() (leaflet.markercluster's own method) computes the
// right target zoom/center, then hands off to the map's setView()/
// fitBounds() — which use Leaflet's CSS-transition-based zoom animation.
// That path has a hardcoded, non-configurable 250ms cleanup timer
// (Map.prototype._animateZoom's WebKit transitionend workaround) that snaps
// the map to its final position at the 250ms mark no matter how long the
// CSS transition itself is set to run — so simply lengthening the CSS
// duration produces a smooth glide for ~250ms that then jump-cuts the rest
// of the way, which is worse than the default.
//
// map.flyTo() sidesteps this entirely — it's a plain requestAnimationFrame
// loop with its own explicit, fully-respected `duration` option, not the
// CSS-transition path. So: let zoomToBounds() do its own zoom-level/center
// arithmetic as normal, but briefly intercept whichever of setView/
// fitBounds it calls and redirect that one call to flyTo with our own
// duration instead.
function zoomToBoundsSmoothly(cluster, map) {
  const originalSetView = map.setView.bind(map);
  const originalFitBounds = map.fitBounds.bind(map);

  map.setView = (center, zoom) => {
    map.setView = originalSetView;
    map.fitBounds = originalFitBounds;
    map.flyTo(center, zoom, { duration: CLUSTER_ZOOM_DURATION_SECONDS });
  };
  map.fitBounds = (bounds, options) => {
    map.setView = originalSetView;
    map.fitBounds = originalFitBounds;
    map.flyTo(bounds.getCenter(), map.getBoundsZoom(bounds, false, options && options.padding), {
      duration: CLUSTER_ZOOM_DURATION_SECONDS,
    });
  };

  cluster.zoomToBounds();

  // Safety net: zoomToBounds() always calls exactly one of the two above,
  // but restore unconditionally in case a future library version doesn't.
  map.setView = originalSetView;
  map.fitBounds = originalFitBounds;
}

// leaflet.markercluster's own MarkerClusterGroup.prototype._zoomOrSpiderfy
// (registered internally on 'clusterclick clusterkeypress' during onAdd)
// skips straight to spiderfy whenever a cluster's members will NEVER
// separate even at the map's max zoom (bottomCluster._zoom === maxZoom) —
// regardless of what zoom the user is CURRENTLY at. Two flats sitting at
// (near-)identical coordinates trigger that the instant their cluster is
// clicked, even far below max zoom, skipping the zoom-in animation every
// other (splittable) cluster gets. Worse, spiderfying overlapping pins apart
// is inherently a poor fit for markers as wide as our flat chips (however
// well-tuned the spiderfy spacing/timing is) — a direct list is just a
// better answer than fanning them out on the map.
//
// So for clusters that will genuinely never separate, this replaces the
// zoom-then-spiderfy dance with `onNeverSplitCluster(markers)` instead —
// call site decides what to show for them (e.g. a picker listing each one).
// The FIRST click on such a cluster still just zooms in (partway to max
// zoom), matching the click-to-zoom feel of every other cluster; only a
// SECOND click — once that zoom-in can't get them any closer — calls
// onNeverSplitCluster. Genuinely splittable clusters are unaffected: they
// always zoom in smoothly via zoomToBoundsSmoothly, same as the library's
// own default click behavior otherwise would.
//
// If no onNeverSplitCluster is given, falls back to the library's own
// spiderfy behavior (still with the smooth-zoom fix), for layers that don't
// want the picker treatment.
//
// No public option exists for any of this, so the fix is to replace the
// group's registered listener with the handler this factory returns:
//   group.off("clusterclick clusterkeypress", group._zoomOrSpiderfy, group);
//   group.on("clusterclick clusterkeypress", createClusterClickHandler({...}), group);
export function createClusterClickHandler({ onNeverSplitCluster } = {}) {
  return function clusterClickHandler(e) {
    // `this` is the MarkerClusterGroup instance (bound via the 3rd .on() arg).
    const group = this;
    const cluster = e.layer;
    let bottomCluster = cluster;

    if (e.type === "clusterkeypress" && e.originalEvent && e.originalEvent.keyCode !== 13) {
      return;
    }

    while (bottomCluster._childClusters.length === 1) {
      bottomCluster = bottomCluster._childClusters[0];
    }

    const neverSplits = bottomCluster._zoom === group._maxZoom && bottomCluster._childCount === cluster._childCount;

    if (neverSplits && onNeverSplitCluster) {
      const map = group._map;
      const currentZoom = map.getZoom();
      // Flagged on the underlying marker (a genuinely stable reference,
      // unlike cluster tree nodes) once this pair has already had its one
      // click-to-zoom — a second click on the same pair shows the picker
      // instead of zooming again.
      const anyChildMarker = cluster.getAllChildMarkers()[0];
      const alreadyZoomedOnce = anyChildMarker && anyChildMarker.__neverSplitZoomed;

      if (!alreadyZoomedOnce && currentZoom < group._maxZoom) {
        if (anyChildMarker) anyChildMarker.__neverSplitZoomed = true;
        const halfwayZoom = Math.round((currentZoom + group._maxZoom) / 2);
        map.flyTo(cluster.getLatLng(), halfwayZoom, { duration: CLUSTER_ZOOM_DURATION_SECONDS });
        return;
      }

      onNeverSplitCluster(cluster.getAllChildMarkers());
      return;
    }

    const atMaxZoom = group._map.getZoom() === group._maxZoom;

    if (neverSplits && group.options.spiderfyOnMaxZoom && atMaxZoom) {
      cluster.spiderfy();
    } else if (group.options.zoomToBoundsOnClick) {
      zoomToBoundsSmoothly(cluster, group._map);
      if (neverSplits && group.options.spiderfyOnMaxZoom) {
        // bottomCluster (a node in the pre-built cluster tree) is NOT
        // reliably the object leaflet.markercluster actually mounts on the
        // map once the zoom settles — calling .spiderfy() on it directly
        // silently no-ops or spiderfies a stale/disconnected node (no
        // _icon, wrong child count). getVisibleParent() is the group's own
        // public API for "whatever's actually rendered for this original
        // marker right now", which correctly re-resolves after the zoom
        // instead of relying on a tree reference captured before it.
        const anyChildMarker = cluster.getAllChildMarkers()[0];
        const trySpiderfy = () => {
          if (group._inZoomAnimation) {
            group.once("animationend", trySpiderfy);
            return;
          }
          const visible = anyChildMarker && group.getVisibleParent(anyChildMarker);
          if (visible && visible.spiderfy) visible.spiderfy();
        };
        group._map.once("zoomend", trySpiderfy);
      }
    }

    if (group.options.spiderfyOnEveryZoom) {
      cluster.spiderfy();
    }

    if (e.originalEvent && e.originalEvent.keyCode === 13) {
      group._map._container.focus();
    }
  };
}
