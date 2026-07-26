import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchJson } from "../lib/api.js";

export function useAddFlatPhotos(flatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photos) => patchJson(`/flats/${flatId}/photos`, { photos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats"] });
    },
  });
}
