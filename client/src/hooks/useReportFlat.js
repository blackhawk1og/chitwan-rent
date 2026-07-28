import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

export function useReportFlat(flatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason) => postJson(`/flats/${flatId}/report`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats"] });
    },
  });
}
