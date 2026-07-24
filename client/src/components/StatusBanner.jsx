const ACCENT = {
  teal: { bg: "bg-accent-teal", text: "text-accent-teal" },
  purple: { bg: "bg-accent-purple", text: "text-accent-purple" },
  orange: { bg: "bg-accent-orange", text: "text-accent-orange" },
};

// Single reusable status banner driving the collapsed top-bar layout shared
// by Avlb Flats, List My Flat, and Find a Flat — whichever flow is active
// swaps in its own title/subtitle/accent, but the slot and behavior are the same.
export default function StatusBanner({ accent = "teal", title, subtitle, cancelLabel = "Cancel", onCancel }) {
  const { bg, text } = ACCENT[accent];
  return (
    <div className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 shadow-2xl ${bg}`}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white">{title}</div>
        {subtitle && <div className="text-xs text-white/80">{subtitle}</div>}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className={`shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold transition hover:bg-white/90 ${text}`}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
