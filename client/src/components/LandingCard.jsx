import { useState } from "react";
import { Link } from "react-router-dom";
import LegalModal from "./LegalModal.jsx";

const SHARE_MESSAGE =
  "Check out chitwan.rent — every rental in Chitwan on one map. ₹0 brokerage, no signup needed to browse. 🏠📍";

// Strips a trailing "-<digits>" ward suffix (e.g. "Bharatpur-10" -> "Bharatpur")
// so the coverage line reads like a place name instead of an internal ward
// code, while still only ever showing names that exist in the real `areas`
// list (see useAreas()/GET /api/areas) — never a hardcoded guess.
function coverageAreaNames(areas) {
  const seen = new Set();
  const names = [];
  for (const a of areas) {
    const name = a.area.replace(/-\d+$/, "");
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function Tile({ emoji, title, subtitle, to, onClick }) {
  const className =
    "flex h-full flex-col items-start gap-1 rounded-2xl border border-white/10 bg-surface-alt px-4 py-3.5 text-left transition hover:border-white/20 hover:bg-white/5";
  const content = (
    <>
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="mt-1 text-sm font-bold text-text-primary">{title}</span>
      {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

// The first screen visitors land on, before the map itself — replaces the
// old visitor/listing/rent-count stats card (see this feature's task: those
// numbers are explicitly gone, not just hidden). Shown on every page load
// (not gated by a "seen" flag — every refresh shows it again), and
// dismissed for that session by "Let's start" or by picking any of the four
// tiles below — "Share" alone does not dismiss it.
export default function LandingCard({ onDismiss, areas = [] }) {
  const [legalModal, setLegalModal] = useState(null); // 'privacy' | 'terms' | null

  const handleShareWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`, "_blank", "noopener,noreferrer");
  };

  const coverageNames = coverageAreaNames(areas);
  const coverageLine =
    coverageNames.length > 0
      ? `Now covering ${coverageNames.slice(0, 6).join(", ")}${coverageNames.length > 6 ? " & more" : ""} across Chitwan`
      : null;

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
        <h1 className="text-xl font-extrabold leading-tight text-text-primary">
          Every rental in Chitwan, on one map
        </h1>

        <div className="mt-3 inline-flex items-center rounded-2xl border border-accent-purple/30 bg-accent-purple/15 px-3 py-1.5">
          <span className="text-sm font-extrabold text-accent-purple-light">₹0 brokerage, always</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Tile emoji="🗺️" title="Browse flats on the map" onClick={onDismiss} />
          <Tile
            emoji="🏠"
            title="List your flat"
            subtitle="Free, no brokerage"
            to="/list-my-flat"
            onClick={onDismiss}
          />
          <Tile emoji="🔍" title="Tell owners what you want" to="/find-a-flat" onClick={onDismiss} />
          <Tile emoji="💰" title="Pin your rent" subtitle="Anonymous" onClick={onDismiss} />
        </div>

        {coverageLine && <p className="mt-5 text-xs text-text-muted">{coverageLine}</p>}

        <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-surface-alt px-4 py-3.5">
          <span className="text-xl leading-none">📮</span>
          <span className="flex-1 text-sm font-semibold text-text-primary">Spotted a To-Let board? Snap it.</span>
          <span className="rounded-full bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            NEW
          </span>
        </div>

        <p className="mt-5 text-xs text-text-muted">
          By moving forward to the map, you agree to our{" "}
          <button
            type="button"
            onClick={() => setLegalModal("privacy")}
            className="text-accent-purple-light hover:underline"
          >
            Privacy Policy
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() => setLegalModal("terms")}
            className="text-accent-purple-light hover:underline"
          >
            Terms of Use
          </button>
          .{" "}
          <Link to="/how-to-use" onClick={onDismiss} className="text-accent-purple-light hover:underline">
            Learn how to use
          </Link>
          . About &middot; Contact
        </p>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={handleShareWhatsapp}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-500"
          >
            {"📱 Share"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-full bg-accent-teal py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Let's start
          </button>
        </div>
      </div>

      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}
