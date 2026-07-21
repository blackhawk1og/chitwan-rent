import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";

export function useFlats(status = "available") {
  return useQuery({
    queryKey: ["flats", status],
    queryFn: () => fetchJson(`/flats?status=${encodeURIComponent(status)}`),
  });
}
