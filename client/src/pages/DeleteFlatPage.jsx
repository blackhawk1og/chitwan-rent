import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowLeft } from "lucide-react";
import TextField from "../components/ui/TextField.jsx";
import { postJson } from "../lib/api.js";

// Standalone route (not a modal) — reached by navigating to /deleteflat
// directly, e.g. from the delete-code email. No auth: the 10-digit code is
// itself the credential, consistent with this app's login-free
// find-or-create auth (see server's POST /api/flats/:id/delete).
export default function DeleteFlatPage() {
  const [flatId, setFlatId] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // null | { type: "success" } | { type: "error", message }

  const isValid = /^\d+$/.test(flatId) && /^\d{10}$/.test(code);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      await postJson(`/flats/${flatId}/delete`, { code });
      setResult({ type: "success" });
    } catch (err) {
      // The server already produces the exact right copy for every case
      // (wrong ID/code, not-yet-eligible with its date, too many attempts),
      // so this is a direct passthrough rather than re-classifying err here.
      setResult({ type: "error", message: err.message || "Something went wrong — please try again." });
    } finally {
      setSubmitting(false);
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

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
            <Trash2 size={18} />
          </div>
          <h1 className="text-lg font-bold text-text-primary">Delete your listing</h1>
        </div>

        <p className="mt-4 text-sm text-text-primary/90">
          Enter your flat's ID and the 10-digit code emailed to you when your listing was verified. This
          permanently removes it from the map.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          A listing can only be deleted once it's been live for 24 hours since verification — so a very recent
          listing being rejected as "not yet eligible" is expected, not an error.
        </p>

        {result?.type === "success" ? (
          <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
            Your listing has been removed.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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

            <button
              type="submit"
              disabled={!isValid || submitting}
              className="w-full rounded-full bg-red-500 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Deleting…" : "Delete listing"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
