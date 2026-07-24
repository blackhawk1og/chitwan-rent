import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson, postJson } from "../lib/api.js";

export function useFlatComments(flatId) {
  return useQuery({
    queryKey: ["flat-comments", flatId],
    queryFn: () => fetchJson(`/flats/${flatId}/comments`),
    enabled: Boolean(flatId),
  });
}

export function useCreateFlatComment(flatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text) => postJson(`/flats/${flatId}/comments`, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flat-comments", flatId] });
    },
  });
}
