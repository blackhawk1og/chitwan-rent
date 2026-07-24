import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

export function useRateFlat(flatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stars) => postJson(`/flats/${flatId}/rating`, { stars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats"] });
    },
  });
}
