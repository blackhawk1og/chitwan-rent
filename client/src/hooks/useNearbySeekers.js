import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useNearbySeekers(lat, lng, radius = 3000) {
  return useQuery({
    queryKey: ["stats-nearby-seekers", lat, lng, radius],
    queryFn: () => fetchJson(`/stats/nearby-seekers?lat=${lat}&lng=${lng}&radius=${radius}`),
    enabled: lat != null && lng != null,
  });
}
