import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

// bounds: { north, south, east, west }
export function useAreaStats(bounds, type = "all", enabled = true) {
  const bbox = bounds ? `${bounds.south},${bounds.west},${bounds.north},${bounds.east}` : null;
  return useQuery({
    queryKey: ["stats-area", bbox, type],
    queryFn: () => fetchJson(`/stats/area?bbox=${bbox}&type=${type}`),
    enabled: enabled && Boolean(bbox),
  });
}
