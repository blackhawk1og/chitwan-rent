import { useState } from "react";
import { Eye, Car, Calendar, Utensils, Cigarette } from "lucide-react";
import Modal from "./Modal.jsx";
import { formatRs } from "../lib/format.js";

function Tag({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-alt px-3 py-1.5 text-xs font-semibold text-text-primary">
      {Icon && <Icon size={13} />}
      {children}
    </span>
  );
}

const LOOKING_FOR_LABEL = { whole_flat: "Whole flat", room: "Room in a flat" };
const MOVE_IN_LABEL = { asap: "ASAP", next_month: "Next month", flexible: "Flexible" };
const FOOD_LABEL = { veg: "Veg", non_veg: "Non-veg", any: "Any food" };
const SMOKER_LABEL = { smoker: "Smoker OK", non_smoker: "Non-smoker only" };

export default function SeekerDetailCard({ seeker, onClose }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xl font-extrabold text-text-primary">
            {LOOKING_FOR_LABEL[seeker.looking_for] ?? "Looking for a place"}
          </div>
          <div className="text-sm text-text-muted">{seeker.area}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-accent-teal">{formatRs(seeker.budget)}</div>
          <div className="text-xs text-text-muted">budget / month</div>
        </div>
      </div>

      {seeker.lifestyle_note && (
        <p className="mt-3 text-sm italic text-text-primary/90">"{seeker.lifestyle_note}"</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {seeker.bhk_pref && (
          <Tag>{seeker.bhk_pref === "any" ? "Any BHK" : `${seeker.bhk_pref} BHK preferred`}</Tag>
        )}
        {seeker.move_in && <Tag icon={Calendar}>{MOVE_IN_LABEL[seeker.move_in]}</Tag>}
        {seeker.food_pref && <Tag icon={Utensils}>{FOOD_LABEL[seeker.food_pref]}</Tag>}
        {seeker.smoker_ok && <Tag icon={Cigarette}>{SMOKER_LABEL[seeker.smoker_ok]}</Tag>}
        {seeker.parking_required && <Tag icon={Car}>Needs parking</Tag>}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-surface-alt p-4">
        {revealed ? (
          <div className="space-y-1 text-sm">
            <div className="text-text-muted">{seeker.phone || "Phone not available"}</div>
            <div className="text-text-muted">{seeker.email || "Email not available"}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-text-muted">•••• ••• •••</div>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="flex items-center gap-1.5 rounded-full bg-accent-teal px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
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
