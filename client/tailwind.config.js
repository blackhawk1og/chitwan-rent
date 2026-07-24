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
      },
      animation: {
        "attention-pulse": "attention-pulse 0.6s ease-in-out 3",
      },
    },
  },
  plugins: [],
};
