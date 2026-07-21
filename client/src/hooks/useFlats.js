import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "../lib/api.js";
import { buildFlatsQueryParams } from "../lib/filters.js";

export function useFlats(filters) {
  const params = buildFlatsQueryParams(filters);
  const queryString = params.toString();

  return useQuery({
    queryKey: ["flats", queryString],
    queryFn: () => fetchJson(`/flats${queryString ? `?${queryString}` : ""}`),
  });
}
