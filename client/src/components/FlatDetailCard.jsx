import { useState } from "react";
import { Eye, PawPrint, Car, Ruler, ShieldCheck, ShieldOff, Users, Home } from "lucide-react";
import Modal from "./Modal.jsx";
import PhotoCarousel from "./PhotoCarousel.jsx";
import { formatRs, bhkLabel } from "../lib/format.js";

function Tag({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-alt px-3 py-1.5 text-xs font-semibold text-text-primary">
      {Icon && <Icon size={13} />}
      {children}
    </span>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-alt px-3 py-2">
      <Icon size={15} className="text-text-muted" />
      <div>
        <div className="text-xs text-text-muted">{label}</div>
        <div className="text-sm font-bold text-text-primary">{value}</div>
      </div>
    </div>
  );
}

const PETS_LABEL = { yes: "Pets OK", no: "No pets", not_sure: "Pets: not sure" };
const WHO_LIVES_LABEL = { family: "Family", bachelor: "Bachelor" };

export default function FlatDetailCard({ flat, onClose }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-lg">
      <PhotoCarousel photos={flat.photos ?? []} />

      <div className="mt-4 flex items-start justify-between">
        <div>
          <div className="text-xl font-extrabold text-text-primary">{bhkLabel(flat.bhk)}</div>
          <div className="text-sm text-text-muted">{flat.area}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-accent-purple-light">{formatRs(flat.rent)}</div>
          {flat.deposit && <div className="text-xs text-text-muted">Deposit {formatRs(flat.deposit)}</div>}
        </div>
      </div>

      {flat.one_liner && <p className="mt-3 text-sm italic text-text-primary/90">"{flat.one_liner}"</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag icon={Home}>{flat.furnishing === "furnished" ? "Furnished" : "Unfurnished"}</Tag>
        <Tag icon={flat.gated === "gated" ? ShieldCheck : ShieldOff}>
          {flat.gated === "gated" ? "Gated" : "Not gated"}
        </Tag>
        {flat.who_lives && <Tag icon={Users}>{WHO_LIVES_LABEL[flat.who_lives]}</Tag>}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat icon={PawPrint} label="Pets" value={flat.pets_allowed ? PETS_LABEL[flat.pets_allowed] : "—"} />
        <Stat icon={Car} label="Parking" value={`${flat.parking_for ?? 0} cars`} />
        <Stat icon={Ruler} label="Area" value={flat.sqft ? `${flat.sqft} sq.ft` : "—"} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-surface-alt p-4">
        {revealed ? (
          <div className="space-y-1 text-sm">
            <div className="font-bold text-text-primary">{flat.owner_name || "A rental hero"}</div>
            <div className="text-text-muted">{flat.owner_phone || "Phone not available"}</div>
            <div className="text-text-muted">{flat.owner_email || "Email not available"}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-text-muted">•••• ••• •••</div>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="flex items-center gap-1.5 rounded-full bg-accent-purple px-4 py-2 text-xs font-bold text-white transition hover:bg-accent-purple-light"
            >
              <Eye size={14} />
              Reveal contact
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
