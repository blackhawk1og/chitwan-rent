import Modal from "./Modal.jsx";

function ToolRow({ emoji, title, description, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
        active ? "border-accent-purple bg-accent-purple/10" : "border-white/10 bg-surface-alt hover:bg-white/5"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-text-primary">{title}</div>
        <div className="text-xs text-text-muted">{description}</div>
      </div>
      {active && (
        <span className="shrink-0 rounded-full bg-accent-purple px-2.5 py-1 text-[10px] font-bold text-white">
          ON
        </span>
      )}
    </button>
  );
}

export default function MoreModal({ onClose, onLocateMe, onToggleHidePins, pinsHidden, onAreaStats }) {
  return (
    <Modal onClose={onClose} maxWidthClass="max-w-sm">
      <h2 className="text-lg font-bold text-text-primary">More tools</h2>

      <div className="mt-5 space-y-3">
        <ToolRow
          emoji="📍"
          title="Locate me"
          description="Centre the map on where you are"
          onClick={onLocateMe}
        />
        <ToolRow
          emoji="👁"
          title="Hide pins"
          description="Clear the map to see the streets clearly"
          onClick={onToggleHidePins}
          active={pinsHidden}
        />
        <ToolRow
          emoji="📐"
          title="Area stats"
          description="Draw an area, get its average rent by BHK"
          onClick={onAreaStats}
        />
      </div>
    </Modal>
  );
}
