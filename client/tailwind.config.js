/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0c17",
        "bg-alt": "#0e0f1e",
        surface: "#151626",
        "surface-alt": "#1a1b2e",
        accent: {
          purple: "#7c3aed",
          "purple-light": "#8b5cf6",
          teal: "#14b8a6",
          orange: "#f59e0b",
        },
        text: {
          primary: "#f5f5f7",
          muted: "#9ca3af",
        },
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.08)",
      },
      keyframes: {
        "attention-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(124,58,237,0.65)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 0 8px rgba(124,58,237,0)", transform: "scale(1.08)" },
        },
        "locate-pulse": {
          "0%": { transform: "scale(0.6)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "pin-glow-blink": {
          "0%, 100%": { filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.55))" },
          "50%": {
            filter: "drop-shadow(0 0 2px rgba(255,255,255,0.95)) drop-shadow(0 0 4px rgba(66,133,244,0.95))",
          },
        },
        // Used by InitialLoadScreen's rotating tips — a fresh key={index}
        // remounts the <p> on every tip change, replaying this fade-in for
        // a lightweight crossfade feel out of a single keyframe.
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Slow ambient glow for StatusBanner (Avlb Flats / List My Flat /
        // Find a Flat's status cards) — one keyframe per accent color since
        // those are the only three StatusBanner ever uses, matching the
        // banner's own bg-accent-* fill rather than a single fixed hue.
        "card-glow-teal": {
          "0%, 100%": { boxShadow: "0 0 12px 1px rgba(20,184,166,0.45)" },
          "50%": { boxShadow: "0 0 26px 6px rgba(20,184,166,0.85)" },
        },
        "card-glow-purple": {
          "0%, 100%": { boxShadow: "0 0 12px 1px rgba(124,58,237,0.45)" },
          "50%": { boxShadow: "0 0 26px 6px rgba(124,58,237,0.85)" },
        },
        "card-glow-orange": {
          "0%, 100%": { boxShadow: "0 0 12px 1px rgba(245,158,11,0.45)" },
          "50%": { boxShadow: "0 0 26px 6px rgba(245,158,11,0.85)" },
        },
      },
      animation: {
        "attention-pulse": "attention-pulse 0.6s ease-in-out 3",
        "locate-pulse": "locate-pulse 1.8s ease-out infinite",
        "pin-glow-blink": "pin-glow-blink 0.5s ease-in-out 1",
        "fade-in": "fade-in 0.4s ease-out",
        "card-glow-teal": "card-glow-teal 2.2s ease-in-out infinite",
        "card-glow-purple": "card-glow-purple 2.2s ease-in-out infinite",
        "card-glow-orange": "card-glow-orange 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
