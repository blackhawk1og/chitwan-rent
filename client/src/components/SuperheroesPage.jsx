import { Award, X, Loader2 } from "lucide-react";
import { useSuperheroes } from "../hooks/useSuperheroes.js";

const MEDALS = ["🥇", "🥈", "🥉"];

function HeroCard({ hero, rank }) {
  const displayName = hero.name || "A rental hero";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange/20 text-lg font-extrabold text-accent-orange">
          {rank < 3 ? <span className="text-2xl">{MEDALS[rank]}</span> : initial}
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-text-primary">{hero.spots}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">spots</div>
        </div>
      </div>
      <div className="mt-3 truncate text-sm font-bold text-text-primary">{displayName}</div>
      {rank >= 3 && <div className="text-xs text-text-muted">Rank #{rank + 1}</div>}
      {hero.sample_message && (
        <p className="mt-2 line-clamp-2 text-xs italic text-text-muted">"{hero.sample_message}"</p>
      )}
    </div>
  );
}

export default function SuperheroesPage({ onClose }) {
  const { data: heroes = [], isLoading } = useSuperheroes();

  return (
    <div className="fixed inset-0 z-[2000] overflow-y-auto bg-bg">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-orange/20 text-accent-orange">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-text-primary">Chitwan's Rental Superheroes</h1>
              <p className="mt-1 max-w-xl text-sm text-text-muted">
                They walk the streets so you don't have to. Every board they snap is a flat someone finds
                without paying a broker.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-muted transition hover:bg-white/10 hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              Loading leaderboard…
            </div>
          ) : heroes.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">No superheroes yet — be the first.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {heroes.map((hero, i) => (
                <HeroCard key={hero.id} hero={hero} rank={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
