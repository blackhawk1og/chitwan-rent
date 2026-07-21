import { NavLink } from "react-router-dom";
import { HelpCircle, Home, KeyRound, Search, Award } from "lucide-react";

const NAV_ITEMS = [
  { to: "/how-to-use", label: "How to use", icon: HelpCircle, end: false },
  { to: "/", label: "Avlb Flats", icon: Home, end: true },
  { to: "/list-my-flat", label: "List My Flat", icon: KeyRound, end: false },
  { to: "/find-a-flat", label: "Find a Flat", icon: Search, end: false },
  { to: "/superheroes", label: "Superheroes", icon: Award, end: false },
];

export default function TopNavPill({ pushDown = false }) {
  return (
    <nav
      className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-surface/90 p-1.5 shadow-2xl backdrop-blur-md ${
        pushDown ? "top-36 sm:top-16" : "top-20 sm:top-4"
      }`}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-accent-purple text-white"
                : "text-text-muted hover:bg-white/5 hover:text-text-primary"
            }`
          }
        >
          <Icon size={16} />
          <span className="hidden sm:inline">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
