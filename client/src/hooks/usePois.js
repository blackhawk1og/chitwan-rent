import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function usePois(category, enabled = true) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return useQuery({
    queryKey: ["pois", category ?? "all"],
    queryFn: () => fetchJson(`/pois${query}`),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
