const ACCENT_CLASSES = {
  purple: "border-accent-purple bg-accent-purple text-white",
  teal: "border-accent-teal bg-accent-teal text-white",
};

export default function Pill({ active, onClick, accent = "purple", children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active ? ACCENT_CLASSES[accent] : "border-white/10 bg-surface-alt text-text-primary hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
