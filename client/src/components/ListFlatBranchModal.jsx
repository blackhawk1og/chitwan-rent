import { Building2, BedDouble } from "lucide-react";
import Modal from "./Modal.jsx";

function BranchCard({ icon: Icon, iconBg, iconColor, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-surface-alt px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/5"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-text-primary">{title}</div>
        <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
      </div>
    </button>
  );
}

export default function ListFlatBranchModal({ rentLabel, bhkLabel, onSelectFlat, onSelectFlatmate, onClose }) {
  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <h2 className="pr-8 text-xl font-bold text-text-primary">List your flat</h2>
      <p className="mt-1.5 text-sm font-semibold text-accent-orange">
        Your pin: {rentLabel} · {bhkLabel}
      </p>

      <p className="mt-5 text-sm font-medium text-text-muted">I want to...</p>

      <div className="mt-3 flex flex-col gap-3">
        <BranchCard
          icon={Building2}
          iconBg="bg-accent-purple/20"
          iconColor="text-accent-purple-light"
          title="Rent out the whole flat"
          subtitle="List the entire flat for rent."
          onClick={onSelectFlat}
        />
        <BranchCard
          icon={BedDouble}
          iconBg="bg-accent-teal/20"
          iconColor="text-accent-teal"
          title="Find a flatmate for a room"
          subtitle="Rent out a room and find a compatible flatmate."
          onClick={onSelectFlatmate}
        />
      </div>
    </Modal>
  );
}
