import { useMutation } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

export function useFlatInterest(flatId) {
  return useMutation({
    mutationFn: (body) => postJson(`/flats/${flatId}/interest`, body),
  });
}
