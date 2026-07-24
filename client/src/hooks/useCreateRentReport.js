import { useMutation } from "@tanstack/react-query";
import { postJson } from "../lib/api.js";

// Anonymous — no auth, no query invalidation to tie back to a user. Feeds
// future Area Stats aggregation alongside real flat listings.
export function useCreateRentReport() {
  return useMutation({
    mutationFn: (body) => postJson("/rent-reports", body),
  });
}
