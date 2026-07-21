import { Award, Loader2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { useSuperheroes } from "../hooks/useSuperheroes.js";

const MEDALS = ["🥇", "🥈", "🥉"];

function RankBadge({ rank }) {
  if (rank < 3) {
    return <span className="flex h-9 w-9 shrink-0 items-center justify-center text-xl">{MEDALS[rank]}</span>;
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-muted">
      #{rank + 1}
    </span>
  );
}

export default function SuperheroesModal({ onClose, onSpotToLet }) {
  const { data: heroes = [], isLoading } = useSuperheroes();

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-orange/20 text-accent-orange">
          <Award size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Chitwan's Rental Superheroes</h2>
          <p className="mt-1 text-sm text-text-muted">
            They walk the streets so you don't have to. Every board they snap is a flat someone finds without
            paying a broker.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading leaderboard…
          </div>
        ) : heroes.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No superheroes yet — be the first.</p>
        ) : (
          heroes.map((hero, i) => (
            <div key={hero.id} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0">
              <RankBadge rank={i} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-text-primary">{hero.name || "A rental hero"}</div>
                {i === 0 && hero.sample_message && (
                  <p className="mt-0.5 truncate text-xs italic text-text-muted">"{hero.sample_message}"</p>
                )}
              </div>
              <div className="shrink-0 text-sm font-extrabold text-accent-orange">{hero.spots}</div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onSpotToLet}
        className="mt-5 w-full rounded-full bg-accent-orange py-3 text-sm font-bold text-white transition hover:brightness-110"
      >
        📮 Be the next superhero →
      </button>
    </Modal>
  );
}
