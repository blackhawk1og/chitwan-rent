import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: () => fetchJson("/areas"),
    staleTime: 10 * 60 * 1000,
  });
}
