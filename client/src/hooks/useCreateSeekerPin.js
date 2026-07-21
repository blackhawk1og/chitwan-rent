import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

export function useCreateSeekerPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => postJson("/seeker-pins", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seeker-pins"] });
    },
  });
}
