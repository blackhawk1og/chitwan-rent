import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useBusRoutes(enabled = true) {
  return useQuery({
    queryKey: ["bus-routes"],
    queryFn: () => fetchJson("/bus-routes"),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
