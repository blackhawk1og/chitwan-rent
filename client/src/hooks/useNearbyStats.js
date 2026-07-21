import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useNearbyStats(lat, lng, radius = 2000) {
  return useQuery({
    queryKey: ["stats-nearby", lat, lng, radius],
    queryFn: () => fetchJson(`/stats/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
    enabled: lat != null && lng != null,
  });
}
