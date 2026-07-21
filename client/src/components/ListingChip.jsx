import { X } from "lucide-react";

export default function ListingChip({ stripColor = "#7c3aed", title, subtitle, onExpand, onClose }) {
  return (
    <div className="absolute bottom-4 left-4 z-[1500] flex max-w-xs items-stretch overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: stripColor }} />
      <button type="button" onClick={onExpand} className="min-w-0 flex-1 px-4 py-3 text-left">
        <div className="truncate text-sm font-bold text-text-primary">{title}</div>
        <div className="truncate text-xs text-text-muted">{subtitle}</div>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex w-9 shrink-0 items-center justify-center text-text-muted transition hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}
