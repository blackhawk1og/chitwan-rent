import { NavLink } from "react-router-dom";
import { HelpCircle, Home, KeyRound, Search, Award } from "lucide-react";

const NAV_ITEMS = [
  { key: "how-to-use", to: "/how-to-use", label: "How to use", icon: HelpCircle, end: false },
  { key: "avlb-flats", label: "Avlb Flats", icon: Home, action: true },
  { key: "list-my-flat", to: "/list-my-flat", label: "List My Flat", icon: KeyRound, end: false },
  { key: "find-a-flat", to: "/find-a-flat", label: "Find a Flat", icon: Search, end: false },
  { key: "superheroes", to: "/superheroes", label: "Superheroes", icon: Award, end: false },
];

const pillClass = (active) =>
  `flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm font-semibold shadow-2xl backdrop-blur-md transition ${
    active
      ? "border-accent-purple bg-accent-purple text-white"
      : "border-white/10 bg-surface/90 text-text-muted hover:bg-white/10 hover:text-text-primary"
  }`;

export default function TopNavPill({ avlbFlatsActive = false, onAvlbFlatsClick }) {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        if (item.action) {
          return (
            <button key={item.key} type="button" onClick={onAvlbFlatsClick} className={pillClass(avlbFlatsActive)}>
              <Icon size={16} />
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
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
