import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, MapPin, Loader2 } from "lucide-react";
import { CHITWAN_NOMINATIM_VIEWBOX } from "../lib/mapConfig.js";

async function searchNominatim(q) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", `${q}, Chitwan, Nepal`);
  url.searchParams.set("viewbox", CHITWAN_NOMINATIM_VIEWBOX);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    source: "nominatim",
  }));
}

export default function SearchBar({
  value,
  onChange,
  areas = [],
  onSelectLocation,
  onFilterClick,
  filterCount = 0,
  pushDown = false,
}) {
  const [focused, setFocused] = useState(false);
  const [nominatimResults, setNominatimResults] = useState([]);
  const [loadingNominatim, setLoadingNominatim] = useState(false);

  const localMatches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return areas
      .filter((a) => a.area.toLowerCase().includes(q))
      .slice(0, 6)
      .map((a) => ({ label: a.area, lat: Number(a.lat), lng: Number(a.lng), source: "local" }));
  }, [value, areas]);

  useEffect(() => {
    const q = value.trim();
    if (localMatches.length > 0 || q.length < 3) {
      setNominatimResults([]);
      return;
    }
    setLoadingNominatim(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchNominatim(q);
        setNominatimResults(results);
      } catch {
        setNominatimResults([]);
      } finally {
        setLoadingNominatim(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [value, localMatches.length]);

  const suggestions = localMatches.length > 0 ? localMatches : nominatimResults;
  const showDropdown = focused && value.trim().length > 0 && (suggestions.length > 0 || loadingNominatim);

  const handleSelect = (suggestion) => {
    onChange?.(suggestion.label);
    onSelectLocation?.(suggestion);
    setFocused(false);
  };

  return (
    <div className={`absolute left-4 flex items-start gap-2 ${pushDown ? "top-16" : "top-4"}`}>
      <div className="relative w-64 sm:w-80">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <Search size={16} className="shrink-0 text-text-muted" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search neighbourhood or area…"
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {showDropdown && (
          <div className="absolute left-0 top-full mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            {loadingNominatim && suggestions.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted">
                <Loader2 size={14} className="animate-spin" />
                Searching…
              </div>
            ) : (
              suggestions.map((s, i) => (
                <button
                  key={`${s.source}-${i}`}
                  type="button"
                  onMouseDown={() => handleSelect(s)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-text-primary transition hover:bg-white/5"
                >
                  <MapPin size={14} className="shrink-0 text-text-muted" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))
            )}
          </div>
        )}
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
