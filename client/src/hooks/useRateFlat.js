import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

export function useRateFlat(flatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ localityStars, builtQualityStars }) =>
      postJson(`/flats/${flatId}/rating`, { locality_stars: localityStars, built_quality_stars: builtQualityStars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats"] });
    },
  });
}
