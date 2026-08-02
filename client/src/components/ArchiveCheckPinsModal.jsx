import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { formatRsCompact, formatRelativeTime } from "../lib/format.js";

const LOOKING_FOR_LABEL = { whole_flat: "Whole flat", room: "Room" };

function bhkPrefLabel(bhkPref) {
  return !bhkPref || bhkPref === "any" ? "Any BHK" : `${bhkPref}BHK`;
}

function PinRow({ pin, checked, onToggle }) {
  const archived = Boolean(pin.archived_at);
  return (
    <label
      className={`flex items-start gap-3 rounded-2xl border border-white/10 px-4 py-3.5 ${
        archived ? "bg-surface-alt/40" : "bg-surface-alt"
      }`}
    >
      {!archived && (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 h-5 w-5 shrink-0 accent-accent-purple"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-text-primary">
          {LOOKING_FOR_LABEL[pin.looking_for] ?? "Flat"}
        </div>
        <p className="mt-0.5 text-xs text-text-muted">
          Rs. {formatRsCompact(pin.budget)} &middot; {bhkPrefLabel(pin.bhk_pref)}
        </p>
        <p className="mt-1 text-[11px] text-text-muted/70">
          {archived
            ? `Archived ${formatRelativeTime(pin.archived_at)} ago`
            : `Pinned ${formatRelativeTime(pin.created_at)} ago`}
        </p>
      </div>
    </label>
  );
}

// Shown right before creating a new seeker pin, only when this email already
// has other seeker_pins rows (active and/or archived) — see the by-email
// lookup in MapShell's handleSubmitSeekerForm and GET /api/seeker-pins/
// by-email. Checked active pins get archived (soft, permanent — see
// seeker_pins.archived_at) when the new pin is created; unchecked ones stay
// active untouched. Archived pins are shown as read-only history, never
// checkable, never un-archivable.
export default function ArchiveCheckPinsModal({
  existingPins,
  onArchiveSelectedAndAdd,
  onKeepAllAndAdd,
  onCancel,
  submitting,
}) {
  const activePins = existingPins.filter((p) => !p.archived_at);
  const archivedPins = existingPins.filter((p) => p.archived_at);

  // Pre-checked by default — the default action archives every existing
  // active pin unless the user explicitly unchecks the ones they want to
  // keep, per this feature's spec.
  const [checkedIds, setCheckedIds] = useState(() => new Set(activePins.map((p) => p.id)));

  const toggle = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasActive = activePins.length > 0;

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-md">
      <h2 className="pr-8 text-lg font-bold text-accent-orange">
        {hasActive ? "You already have active searches" : "You have archived searches on file"}
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        {hasActive ? (
          <>
            {activePins.length} existing pin{activePins.length === 1 ? "" : "s"} linked to this email. Uncheck any
            you want to keep active; checked ones will be archived when you add the new pin.
          </>
        ) : (
          "No active pins right now, but this email has archived search history below."
        )}
      </p>

      {activePins.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {activePins.map((pin) => (
            <PinRow key={pin.id} pin={pin} checked={checkedIds.has(pin.id)} onToggle={() => toggle(pin.id)} />
          ))}
        </div>
      )}

      {archivedPins.length > 0 && (
        <>
          <div className="mt-5 text-xs font-bold uppercase tracking-wide text-text-muted">Archived</div>
          <div className="mt-2 space-y-2.5">
            {archivedPins.map((pin) => (
              <PinRow key={pin.id} pin={pin} />
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-text-muted">Archiving is permanent — the pin will be removed from the map.</p>

      <div className="mt-5 flex flex-col gap-2.5">
        {hasActive ? (
          <>
            <button
              type="button"
              onClick={() => onArchiveSelectedAndAdd([...checkedIds])}
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Archive selected + add new pin"}
            </button>
            <button
              type="button"
              onClick={onKeepAllAndAdd}
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-full border border-white/15 py-3 text-sm font-bold text-text-primary transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Keep all, add new pin anyway"}
            </button>
          </>
        ) : (
          // No active pins to make a choice about — "archive selected" and
          // "keep all" would do the exact same thing (create the pin,
          // archive nothing), so only one button is shown.
          <button
            type="button"
            onClick={onKeepAllAndAdd}
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : "Add new pin"}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="w-full rounded-full py-2.5 text-sm font-semibold text-text-muted transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel — don't add new
        </button>
      </div>
    </Modal>
  );
}
