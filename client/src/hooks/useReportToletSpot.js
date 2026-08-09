import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

// Mirrors useReportFlat.js's shape exactly. Invalidating ["tolet-spots"] is
// what actually removes a just-threshold-crossed pin from the map — GET
// /api/tolet-spots already excludes status = 'removed' server-side (see
// routes/toletSpots.js), so a refetch after this resolves is enough; no
// client-side "hide this pin" logic is needed on top of it.
export function useReportToletSpot(spotId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postJson(`/tolet-spots/${spotId}/report`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tolet-spots"] });
    },
  });
}
