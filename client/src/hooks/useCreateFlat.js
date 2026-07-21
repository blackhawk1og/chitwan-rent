import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

export function useCreateFlat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => postJson("/flats", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats"] });
    },
  });
}
