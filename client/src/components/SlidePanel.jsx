import { useEffect, useState } from "react";

// Full detail panel chrome: slides in from the right on desktop (drawer),
// slides up from the bottom on mobile (sheet) — matches the rest of the
// app's modal conventions while giving the flat detail view room to breathe.
export default function SlidePanel({ onClose, children }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000]" onClick={onClose}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface shadow-2xl transition-transform duration-300 ease-out sm:inset-y-0 sm:inset-x-auto sm:right-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-lg sm:rounded-t-none sm:rounded-l-3xl sm:border-l sm:border-t-0 sm:translate-y-0 ${
          entered ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
