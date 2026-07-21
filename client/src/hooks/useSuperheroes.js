import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useSuperheroes() {
  return useQuery({
    queryKey: ["superheroes"],
    queryFn: () => fetchJson("/superheroes"),
  });
}
