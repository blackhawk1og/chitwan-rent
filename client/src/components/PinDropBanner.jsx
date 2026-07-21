const ACCENT_BG = {
  purple: "bg-accent-purple",
  teal: "bg-accent-teal",
  orange: "bg-accent-orange",
};

export default function PinDropBanner({ text, accent = "purple", onCancel }) {
  return (
    <div
      className={`pointer-events-auto fixed inset-x-0 top-0 z-[1600] flex items-center justify-between gap-4 px-6 py-3.5 text-sm font-semibold text-white shadow-lg ${ACCENT_BG[accent]}`}
    >
      <span>{text}</span>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold transition hover:bg-white/25"
      >
        Cancel
      </button>
    </div>
  );
}
