export default function AvlbFlatsBanner({ onCancel }) {
  return (
    <div className="pointer-events-auto absolute left-4 top-36 z-[999] flex items-center gap-4 rounded-2xl bg-accent-teal px-4 py-3 shadow-2xl sm:top-20">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white">Now showing all available flats</div>
        <div className="text-xs text-white/80">Tap Cancel or clear from Filters ↗</div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-accent-teal transition hover:bg-white/90"
      >
        Cancel
      </button>
    </div>
  );
}
