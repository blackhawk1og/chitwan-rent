import { MapPin, ChevronRight } from "lucide-react";
import Modal from "./Modal.jsx";
import { formatRsCompact, bhkLabel } from "../lib/format.js";

// Shown instead of spiderfying when a cluster's flats sit at (near-)
// identical coordinates and will never visually separate on the map, no
// matter how far the user zooms in — see clusterBehavior.js's
// onNeverSplitCluster. A direct list is a better answer than fanning
// overlapping pins out for the user to hunt through.
export default function NearbyFlatsModal({ flats, onSelectFlat, onClose }) {
  return (
    <Modal onClose={onClose} maxWidthClass="max-w-sm">
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
          <MapPin size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">{flats.length} flats at nearly the same spot</h2>
          <p className="mt-1 text-sm text-text-muted">Too close to show as separate pins — tap one to see details.</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {flats.map((flat) => (
          <button
            key={flat.id}
            type="button"
            onClick={() => onSelectFlat(flat)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-surface-alt px-4 py-3 text-left transition hover:bg-white/5"
          >
            <span className="text-sm text-text-primary">
              <span className="font-bold">{formatRsCompact(flat.rent)}</span>
              <span className="text-text-muted"> · {bhkLabel(flat.bhk)}</span>
              {flat.one_liner && <span className="text-text-muted"> · {flat.one_liner}</span>}
            </span>
            <ChevronRight size={16} className="shrink-0 text-text-muted" />
          </button>
        ))}
      </div>
    </Modal>
  );
}
