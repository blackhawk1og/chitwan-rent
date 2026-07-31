import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteJson } from "../lib/api.js";

export function useRemoveFlatPhoto(flatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url) => deleteJson(`/flats/${flatId}/photos`, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats"] });
    },
  });
}
