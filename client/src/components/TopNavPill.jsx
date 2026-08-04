import { NavLink } from "react-router-dom";

// Native emoji instead of single-color line icons — colorful/"realistic" at
// this size, same treatment as the map's POI pins (see GeneralPoisLayer.jsx/
// PoisLayer.jsx).
const NAV_ITEMS = [
  { key: "how-to-use", to: "/how-to-use", label: "How to use", icon: "🧭", end: false },
  { key: "avlb-flats", label: "Avlb Flats", icon: "🏠", action: true },
  { key: "list-my-flat", to: "/list-my-flat", label: "List My Flat", icon: "🔑", end: false },
  { key: "find-a-flat", to: "/find-a-flat", label: "Find a Flat", icon: "🔍", end: false },
  { key: "superheroes", to: "/superheroes", label: "Superheroes", icon: "🦸", end: false },
];

// py-1.5 (not py-1): at the icon-only mobile width the pill's tap target
// measured ~26px tall, below comfortable tap-target guidance — this nudges
// it to ~30-34px without changing the pill's overall compact look.
const pillClass = (active) =>
  `flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-sm font-semibold shadow-2xl backdrop-blur-md transition ${
    active
      ? "border-accent-purple bg-accent-purple text-white"
      : "border-white/10 bg-surface/90 text-text-muted hover:bg-white/10 hover:text-text-primary"
  }`;

export default function TopNavPill({ avlbFlatsActive = false, onAvlbFlatsClick }) {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-2">
      {NAV_ITEMS.map((item) => {
        if (item.action) {
          return (
            <button key={item.key} type="button" onClick={onAvlbFlatsClick} className={pillClass(avlbFlatsActive)}>
              <span className="text-base leading-none">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.end}
            className={({ isActive }) => pillClass(isActive)}
            // HowToUseTour's last step spotlights this specific pill —
            // undefined on every other item so it's a no-op DOM attribute.
            data-tour={item.key === "how-to-use" ? "how-to-use-pill" : undefined}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
