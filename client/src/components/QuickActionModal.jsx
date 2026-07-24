import Modal from "./Modal.jsx";

function QuickActionCard({ emoji, title, subtitle, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-surface-alt px-4 py-3.5 text-left transition hover:border-white/20 hover:bg-white/5"
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-text-primary">{title}</span>
          {badge && (
            <span className="rounded-full bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
      </div>
    </button>
  );
}

export default function QuickActionModal({ onClose, onSelectRentReport, onSelectListFlat, onSelectFindFlat, onSelectSpotToLet }) {
  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <h2 className="pr-8 text-lg font-bold text-text-primary">Add something here</h2>

      <div className="mt-5 flex flex-col gap-2.5">
        <QuickActionCard
          emoji="💰"
          title="What rent are you paying?"
          subtitle="Anonymous rent data point — takes 10 seconds, helps everyone"
          onClick={onSelectRentReport}
        />
        <QuickActionCard
          emoji="🏠"
          title="List my flat"
          subtitle="Reach 1,200+ active seekers — free, direct contact, no broker"
          onClick={onSelectListFlat}
        />
        <QuickActionCard
          emoji="🔍"
          title="I'm looking for a flat"
          subtitle="Drop a seeker pin — matches land in your inbox within minutes"
          onClick={onSelectFindFlat}
        />
        <QuickActionCard
          emoji="📮"
          title="Spotted a To-Let board?"
          badge="NEW"
          subtitle="Snap it — the board's photo + phone number go live on the map"
          onClick={onSelectSpotToLet}
        />
      </div>
    </Modal>
  );
}
