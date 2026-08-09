import { useState } from "react";
import { MapPin, Share2, AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";
import AuthGateModal from "./AuthGateModal.jsx";
import { useReportToletSpot } from "../hooks/useReportToletSpot.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatShortDate } from "../lib/format.js";

// Click-through detail card for a To-Let pin (see ToletSpotsLayer.jsx) — a
// single click opens this directly, no intermediate preview chip like
// flats/seekers go through (ListingChip.jsx), since there's only one photo
// and two actions here, not enough content to warrant a two-step reveal.
//
// Deliberately no call button: the phone number (if any) is visible in the
// photo itself, never auto-dialed or OCR'd out of it — see this feature's
// own scope note (OCR is a separate, later feature). Deliberately no
// spotter name/message line either, even though tolet_spots.message exists
// and used to show in the old plain-Popup version of this layer — the given
// card spec here is header/photo/caption/buttons only; message content can
// be added back as a deliberate follow-up if wanted, not assumed in.
export default function ToletSpotDetailCard({ spot, onClose }) {
  const { isAuthenticated } = useAuth();
  const reportSpot = useReportToletSpot(spot.id);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const submitReport = () => {
    if (reported || reportSpot.isPending) return;
    reportSpot.mutate(undefined, {
      onSuccess: (data) => {
        setReported(true);
        // A report that actually crossed the removal threshold just pulled
        // this spot off the map (see routes/toletSpots.js) — closing here
        // avoids leaving a now-removed spot's card sitting open.
        if (data?.removed) onClose();
      },
    });
  };

  const handleReportClick = () => {
    if (reported || reportSpot.isPending) return;
    if (!isAuthenticated) {
      setAuthGateOpen(true);
      return;
    }
    submitReport();
  };

  const handleShare = async () => {
    const shareData = {
      title: "To-Let board spotted on Chitwan Rent",
      text: "Someone spotted a To-Let board — check it out on Chitwan Rent's map.",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — no-op
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <>
      <Modal onClose={onClose} maxWidthClass="max-w-sm">
        <div className="flex items-center gap-2.5 pr-8">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-orange/20 text-accent-orange">
            <MapPin size={16} />
          </div>
          <h2 className="text-base font-bold text-text-primary">
            To-Let spotted <span className="font-semibold text-text-muted">· {formatShortDate(spot.created_at)}</span>
          </h2>
        </div>

        <img
          src={spot.photo_url}
          alt="To-Let board"
          className="mt-4 h-64 w-full rounded-2xl border border-white/10 object-cover"
        />
        <p className="mt-2 text-center text-xs text-text-muted">
          as seen on board — verify from the photo above
        </p>

        {shareCopied && <p className="mt-3 text-center text-xs text-accent-teal">Link copied to clipboard</p>}
        {reported && <p className="mt-3 text-center text-xs text-red-400">Reported — thanks, we'll take a look.</p>}
        {reportSpot.isError && (
          <p className="mt-3 text-center text-xs text-red-400">Couldn't submit report — try again.</p>
        )}

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-surface-alt py-3 text-sm font-bold text-text-primary transition hover:bg-white/5"
          >
            <Share2 size={15} />
            Share
          </button>
          <button
            type="button"
            onClick={handleReportClick}
            disabled={reported || reportSpot.isPending}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-3 text-sm font-bold transition ${
              reported
                ? "cursor-not-allowed bg-red-500/20 text-red-400"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            <AlertTriangle size={15} />
            {reportSpot.isPending ? "Reporting…" : "Board gone / wrong"}
          </button>
        </div>
      </Modal>

      {authGateOpen && (
        <AuthGateModal
          onSuccess={() => {
            setAuthGateOpen(false);
            submitReport();
          }}
          onCancel={() => setAuthGateOpen(false)}
        />
      )}
    </>
  );
}
