import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, MapPin, Loader2 } from "lucide-react";
import { CHITWAN_NOMINATIM_VIEWBOX } from "../lib/mapConfig.js";

// Lowercases and strips diacritics/accents so e.g. "chandragiri" and a
// future "Chandragiri" with combining marks are treated as equivalent —
// belt-and-braces for Nepali place-name transliterations, even though
// today's seeded area names are all plain ASCII.
function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

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
  places = [],
  onSelectLocation,
  onFilterClick,
  filterCount = 0,
  pulseFilter = false,
}) {
  const [focused, setFocused] = useState(false);
  const [nominatimResults, setNominatimResults] = useState([]);
  const [loadingNominatim, setLoadingNominatim] = useState(false);

  const localMatches = useMemo(() => {
    const q = normalize(value.trim());
    if (!q) return [];

    // Candidates keyed by normalized name so a name appearing in both
    // sources collapses to one entry — `places` (real OSM villages/towns/
    // suburbs/etc.) is merged in AFTER `areas` (flat listing locations,
    // some still backed by only an approximate seed centroid) so it wins
    // the collision, giving the more accurate real-world coordinate.
    const byName = new Map();
    for (const a of areas) byName.set(normalize(a.area), { name: a.area, lat: a.lat, lng: a.lng });
    for (const p of places) byName.set(normalize(p.name), { name: p.name, lat: p.lat, lng: p.lng });

    // Exact match (the whole name, not just the typed prefix) ranks above a
    // pure prefix match, which ranks above a mid-string substring match;
    // ties broken alphabetically so results don't reorder based on
    // incidental area-count/name sort order from the source lists.
    const rank = (normalizedName) => {
      if (normalizedName === q) return 0;
      if (normalizedName.startsWith(q)) return 1;
      return 2;
    };

    return [...byName.entries()]
      .filter(([normalizedName]) => normalizedName.includes(q))
      .sort(([nameA, a], [nameB, b]) => rank(nameA) - rank(nameB) || a.name.localeCompare(b.name))
      .slice(0, 6)
      .map(([, c]) => ({ label: c.name, lat: Number(c.lat), lng: Number(c.lng), source: "local" }));
  }, [value, areas, places]);

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
    <div className="flex w-full items-start gap-2">
      <div className="relative min-w-0 flex-1">
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
          // Explicit z-index (not just being position:absolute) is required
          // here: the nav pill row below uses backdrop-blur, which — like
          // `filter` — creates its own stacking context even without a
          // position/z-index of its own. That promotes the pills into the
          // same auto-z-index paint bucket as this dropdown, where later DOM
          // order (the pills render after the search bar) would otherwise
          // win and paint them on top. A z-index with an explicit value
          // moves the dropdown to the next bucket up, clear of that fight.
          <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
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
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface/90 text-text-primary shadow-2xl backdrop-blur-md transition hover:bg-white/10 ${
          pulseFilter ? "animate-attention-pulse" : ""
        }`}
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
