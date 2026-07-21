import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useToletSpots(enabled = true) {
  return useQuery({
    queryKey: ["tolet-spots"],
    queryFn: () => fetchJson("/tolet-spots"),
    enabled,
  });
}
