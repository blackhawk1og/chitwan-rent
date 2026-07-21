import { Search, SlidersHorizontal } from "lucide-react";

export default function SearchBar({ value, onChange, onFilterClick, filterCount = 0 }) {
  return (
    <div className="absolute left-4 top-4 flex items-center gap-2">
      <div className="flex w-64 items-center gap-2 rounded-full border border-white/10 bg-surface/90 px-4 py-2.5 shadow-2xl backdrop-blur-md sm:w-80">
        <Search size={16} className="shrink-0 text-text-muted" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Search neighbourhood or area…"
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onFilterClick}
        aria-label="Filters"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface/90 text-text-primary shadow-2xl backdrop-blur-md transition hover:bg-white/10"
      >
        <SlidersHorizontal size={16} />
        {filterCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-purple text-[11px] font-bold text-white">
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );
}
