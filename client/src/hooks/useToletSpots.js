import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

// Always fetches — there used to be a manual "Show To-Let boards" filter
// toggle gating this (enabled = that toggle's value), but visibility is now
// purely zoom-based (see ToletSpotsLayer's TOLET_SPOTS_MIN_ZOOM). That
// toggle defaulting to off on every fresh load/refresh is exactly why pins
// appeared to "not show after a refresh" before — the query itself was
// disabled, not just the pins hidden, so no amount of zooming in helped
// until the toggle was flipped back on by hand.
export function useToletSpots() {
  return useQuery({
    queryKey: ["tolet-spots"],
    queryFn: () => fetchJson("/tolet-spots"),
  });
}
