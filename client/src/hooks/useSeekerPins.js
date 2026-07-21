import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useSeekerPins() {
  return useQuery({
    queryKey: ["seeker-pins"],
    queryFn: () => fetchJson("/seeker-pins"),
  });
}
