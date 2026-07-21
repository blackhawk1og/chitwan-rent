const ACCENT_CLASSES = {
  purple: "border-accent-purple bg-accent-purple text-white",
  teal: "border-accent-teal bg-accent-teal text-white",
};

export default function ToggleButton({ active, onClick, icon: Icon, accent = "purple", children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        active ? ACCENT_CLASSES[accent] : "border-white/10 bg-surface-alt text-text-primary hover:bg-white/5"
      }`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}
