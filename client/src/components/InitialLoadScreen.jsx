import { useEffect, useState } from "react";

// Only shown for the very first flats fetch of the session (see MapShell's
// hasLoadedFlatsOnce) — this is specifically the "backend is cold-starting
// on Render's free tier" wait (can run 30-60s), not the quick, frequent
// reloads that happen whenever filters change afterward (those keep the
// small "Loading flats…" pill, unchanged). Purely presentational: doesn't
// touch useFlats/the fetch itself in any way, just what's shown while it's
// in flight.
//
// Copy below is deliberately reused, not reinvented — same brokerage-free/
// no-signup/spot-a-to-let tone as LandingCard.jsx, so this reads as a
// continuation of the app's own voice rather than a bolted-on spinner.
const TIPS = [
  "₹0 brokerage, always — for renters and owners.",
  "No sign-up needed just to browse the map.",
  "List your flat free — no broker, no listing fee.",
  "Spot a To-Let board, snap it, climb the leaderboard.",
  "Pin what you actually pay — anonymous, no name attached.",
  "A weekly digest connects matching seekers and owners automatically.",
];

const TIP_INTERVAL_MS = 2800;

function RotatingTip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TIPS.length), TIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    // key={index} restarts the fade-in on every tip change — cheap way to
    // get a crossfade-ish feel out of one CSS animation instead of tracking
    // two tips' opacity at once.
    <p key={index} className="animate-fade-in text-sm font-semibold text-text-primary">
      {TIPS[index]}
    </p>
  );
}

// Three dots, staggered — reuses Tailwind's built-in animate-bounce (no new
// keyframes needed) with hand-staggered delays for the classic "typing
// indicator" feel instead of all three bouncing in lockstep.
function BouncingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-purple-light"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

// fadingOut is driven by MapShell once the real fetch resolves — this stays
// mounted a beat longer to play the fade rather than popping out instantly,
// then MapShell unmounts it for good.
export default function InitialLoadScreen({ fadingOut = false }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-1/2 z-[1100] flex -translate-y-1/2 justify-center px-4 transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-surface/95 p-5 text-center shadow-2xl backdrop-blur-md animate-card-glow-purple">
        <div className="animate-bounce text-3xl leading-none">🏠</div>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-accent-purple-light">
          Waking up the map
        </p>
        <p className="mt-1 text-[11px] text-text-muted">
          First visit today can take up to a minute — hang tight.
        </p>

        <div className="mt-4 min-h-[2.5rem] border-t border-white/10 pt-3">
          <RotatingTip />
        </div>

        <div className="mt-3 flex justify-center">
          <BouncingDots />
        </div>
      </div>
    </div>
  );
}
