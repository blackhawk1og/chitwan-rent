import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import TextField from "../components/ui/TextField.jsx";
import Modal from "../components/Modal.jsx";
import { postJson } from "../lib/api.js";

// Standalone route (not a modal), replacing the old /deleteflat +
// DeleteFlatPage.jsx — reached from the delete-code email (see server's
// lib/email.js) or a direct link. No auth: the 10-digit code is itself the
// credential, consistent with this app's login-free find-or-create auth.
// Both actions below hit their own endpoint (POST /api/flats/:id/mark-rented,
// POST /api/flats/:id/delete) and each independently re-checks the same code
// server-side (see server's lib/flatCodeVerification.js) — there's no
// separate "verify" step that unlocks a code-free follow-up; the code goes
// out with whichever action is actually confirmed. isValid here is only a
// client-side shape check (same convention DeleteFlatPage.jsx used) so the
// two buttons aren't clickable on obviously-incomplete input — the real
// verification always happens server-side.
export default function FlatStatusPage() {
  const [flatId, setFlatId] = useState("");
  const [code, setCode] = useState("");
  const [confirmingAction, setConfirmingAction] = useState(null); // null | "rent" | "delete"
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // null | { type: "rented" | "deleted" } | { type: "error", message }

  const isValid = /^\d+$/.test(flatId) && /^\d{10}$/.test(code);

  const closeConfirm = () => {
    if (!submitting) setConfirmingAction(null);
  };

  const runAction = async (action) => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      if (action === "rent") {
        await postJson(`/flats/${flatId}/mark-rented`, { code });
        setResult({ type: "rented" });
      } else {
        await postJson(`/flats/${flatId}/delete`, { code });
        setResult({ type: "deleted" });
      }
    } catch (err) {
      // Same passthrough convention as the old DeleteFlatPage — the server
      // already produces the right copy for every case (wrong ID/code,
      // not-yet-eligible with its date, too many attempts).
      setResult({ type: "error", message: err.message || "Something went wrong — please try again." });
    } finally {
      setSubmitting(false);
      setConfirmingAction(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition hover:text-text-primary"
        >
          <ArrowLeft size={14} />
          Back to map
        </Link>

        <h1 className="text-lg font-bold text-text-primary">Manage your listing</h1>
        <p className="mt-4 text-sm text-text-primary/90">
          Enter your flat's ID and the 10-digit code emailed to you when your listing was verified.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Both actions below require your listing to have been live for 24 hours since verification — so a very
          recent listing being rejected as "not yet eligible" is expected, not an error.
        </p>

        {result?.type === "rented" && (
          <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
            Marked as rented — it's off the live map now.
          </div>
        )}
        {result?.type === "deleted" && (
          <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
            Your listing has been removed.
          </div>
        )}

        {result?.type !== "rented" && result?.type !== "deleted" && (
          <>
            <div className="mt-5 space-y-4">
              <TextField
                label="Flat ID *"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 214"
                value={flatId}
                onChange={(e) => setFlatId(e.target.value.replace(/\D/g, ""))}
              />
              <TextField
                label="Code *"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />

              {result?.type === "error" && <p className="text-sm text-red-400">{result.message}</p>}

              {/* Different weight on purpose: mark-as-rented is a normal
                  positive action (teal, checkmark); delete is styled as
                  clearly destructive (red, trash icon, heavier confirm
                  copy) — same distinction the confirm modals below carry
                  through. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setConfirmingAction("rent")}
                  disabled={!isValid || submitting}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-accent-teal py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 size={16} />
                  Mark as rented
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingAction("delete")}
                  disabled={!isValid || submitting}
                  className="flex items-center justify-center gap-1.5 rounded-full border-2 border-red-500 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={16} />
                  Delete listing
                </button>
              </div>
            </div>

            {confirmingAction === "rent" && (
              <Modal onClose={closeConfirm} maxWidthClass="max-w-sm">
                <h2 className="pr-8 text-lg font-bold text-text-primary">Mark flat {flatId} as rented?</h2>
                <p className="mt-2 text-sm text-text-muted">
                  It'll be removed from the live map right away. Your listing's history (ratings, comments) is
                  kept, not deleted.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    disabled={submitting}
                    className="flex-1 rounded-full border border-white/10 bg-surface-alt py-2.5 text-sm font-bold text-text-primary transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction("rent")}
                    disabled={submitting}
                    className="flex-1 rounded-full bg-accent-teal py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Marking…" : "Confirm"}
                  </button>
                </div>
              </Modal>
            )}

            {confirmingAction === "delete" && (
              <Modal onClose={closeConfirm} maxWidthClass="max-w-sm">
                <h2 className="pr-8 flex items-center gap-2 text-lg font-bold text-red-400">
                  <AlertTriangle size={18} />
                  Delete flat {flatId}?
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  This permanently removes the listing and all its comments, ratings, and interest submissions.
                  This cannot be undone.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    disabled={submitting}
                    className="flex-1 rounded-full border border-white/10 bg-surface-alt py-2.5 text-sm font-bold text-text-primary transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction("delete")}
                    disabled={submitting}
                    className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Deleting…" : "Confirm"}
                  </button>
                </div>
              </Modal>
            )}
          </>
        )}
      </div>
    </div>
  );
}
