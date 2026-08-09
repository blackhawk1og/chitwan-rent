import { useMutation } from "@tanstack/react-query";
import { postFormData } from "../lib/api.js";

// Step 1 of "Spot a To-Let" submission — uploads the raw File to Cloudinary
// via the server (routes/toletSpots.js's POST /upload-photo), returning
// { url }. useCreateToletSpot (step 2) then sends that url as photo_url —
// see MapShell.jsx's handleSubmitToletSpot, which awaits this one first.
// No query invalidation here (unlike useCreateToletSpot) — an upload alone
// doesn't create or change anything the map/dashboard reads.
export function useUploadToletPhoto() {
  return useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append("photo", file);
      return postFormData("/tolet-spots/upload-photo", formData);
    },
  });
}
