import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";
import { bhkLabel } from "../lib/format.js";

// Shown only when AddFlatForm's Proceed is clicked while the rent-cap soft
// warning (fixed BHK-based caps, see AddFlatForm.jsx's RENT_CAPS) is active —
// an extra confirmation step on top of that warning, not a replacement for
// it. "Let me re-check" changes nothing; "Yes, it's correct" continues the
// listing flow with rent_flagged = true.
export default function RentCapConfirmModal({ rent, bhk, cap, onReCheck, onConfirm }) {
  return (
    <Modal onClose={onReCheck} maxWidthClass="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
          <AlertTriangle size={26} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-text-primary">Double-check this pin?</h2>
        <p className="mt-2 text-sm text-text-muted">
          This rent (₹{Number(rent).toLocaleString("en-IN")}) is above the typical maximum for a {bhkLabel(bhk)} (₹
          {Number(cap).toLocaleString("en-IN")}). If you continue, this listing will be marked as unusual and
          excluded from matching.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onReCheck}
          className="flex-1 rounded-full border border-white/10 bg-surface-alt py-3 text-sm font-bold text-text-primary transition hover:bg-white/5"
        >
          Let me re-check
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light"
        >
          Yes, it's correct
        </button>
      </div>
    </Modal>
  );
}
