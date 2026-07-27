import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function usePlaces() {
  return useQuery({
    queryKey: ["places"],
    queryFn: () => fetchJson("/places"),
    staleTime: 10 * 60 * 1000,
  });
}
