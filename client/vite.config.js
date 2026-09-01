import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vite only inlines env vars prefixed `VITE_` by default. CARTO_API_KEY is
  // deliberately named without that prefix, so widen the allowlist to cover
  // it — narrowly, by exact prefix, rather than exposing the whole
  // environment. Anything matched here is baked into the public client
  // bundle, so only add prefixes whose values are safe to publish.
  envPrefix: ["VITE_", "CARTO_"],
  server: {
    port: 5173,
  },
});
