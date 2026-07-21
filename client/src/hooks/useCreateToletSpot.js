import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

export function useCreateToletSpot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => postJson("/tolet-spots", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tolet-spots"] });
      queryClient.invalidateQueries({ queryKey: ["superheroes"] });
    },
  });
}
