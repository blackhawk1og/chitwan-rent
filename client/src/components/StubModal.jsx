import Modal from "./Modal.jsx";

export default function StubModal({ onClose, icon: Icon, title, subtitle, phaseNote }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-purple/20 text-accent-purple-light">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {phaseNote && (
        <p className="mt-5 rounded-2xl border border-white/10 bg-surface-alt px-4 py-3 text-sm text-text-muted">
          {phaseNote}
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light"
      >
        Got it
      </button>
    </Modal>
  );
}
