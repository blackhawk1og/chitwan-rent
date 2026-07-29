import { useState } from "react";
import { Flag } from "lucide-react";
import Modal from "./Modal.jsx";

// Reason is optional server-side (see POST /flats/:id/report) so it stays
// optional here too — Report is never disabled just because the textarea is
// empty.
export default function ReportReasonModal({ onCancel, onSubmit, submitting, submitError }) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (submitting) return;
    onSubmit(reason.trim() || null);
  };

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
          <Flag size={26} />
        </div>
        <h2 className="mt-3 text-lg font-bold text-text-primary">Flag this listing?</h2>
        <p className="mt-1 text-sm text-text-muted">
          Report if the rent looks fake or the listing seems suspicious. After 3 flags it's removed from the map.
        </p>
      </div>

      <textarea
        rows={2}
        placeholder="e.g. rent looks fake, wrong location, broker listing…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-5 w-full resize-none rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />

      {submitError && <p className="mt-3 text-center text-sm text-red-400">{submitError}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-white/10 bg-surface-alt py-3 text-sm font-bold text-text-primary transition hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500/20 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            "Reporting…"
          ) : (
            <>
              Report <Flag size={14} />
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
