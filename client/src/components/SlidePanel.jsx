import { useEffect, useState } from "react";

// Full detail panel chrome: a centered modal card on desktop (dimmed/blurred
// map visible all around it, like the app's other modals), a bottom sheet on
// mobile — matches existing responsive conventions without edge-docking.
export default function SlidePanel({ onClose, children }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] sm:flex sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      {/* Positioned (not static) so it stays in the same stacking group as
          the card below and paints in DOM order — a static sibling would
          otherwise sit BEHIND this positioned overlay regardless of DOM
          order, which is what caused the card to render blurred/unclickable. */}
      <div
        className={`absolute inset-0 z-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 z-10 flex max-h-[92vh] flex-col overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface shadow-2xl transition-transform duration-300 ease-out sm:relative sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-[450px] sm:rounded-3xl sm:border sm:transform-none sm:transition-none ${
          entered ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
