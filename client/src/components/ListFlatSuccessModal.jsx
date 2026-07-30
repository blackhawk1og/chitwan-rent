import { useRef, useState } from "react";
import { CheckCircle2, Camera } from "lucide-react";
import Modal from "./Modal.jsx";
import { useNearbySeekers } from "../hooks/useNearbySeekers.js";
import { useAddFlatPhotos } from "../hooks/useAddFlatPhotos.js";

const DEFAULT_SHARE_MESSAGE =
  "Just pinned my rental details anonymously on chitwan.rent 📍 It's Chitwan's first anonymous rent map — no brokers, no listings, just what people actually pay. Takes 20 seconds & no signup.";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ListFlatSuccessModal({ flat, onClose }) {
  const { data: nearbyData, isLoading: nearbyLoading } = useNearbySeekers(flat.lat, flat.lng, 3000);
  const addPhotos = useAddFlatPhotos(flat.id);
  const fileInputRef = useRef(null);

  const [photos, setPhotos] = useState(flat.photos ?? []);
  const [shareText, setShareText] = useState(DEFAULT_SHARE_MESSAGE);
  const [copied, setCopied] = useState(false);

  const remainingSlots = 6 - photos.length;

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files ?? []).slice(0, remainingSlots);
    e.target.value = "";
    if (files.length === 0) return;
    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      const updated = await addPhotos.mutateAsync(dataUrls);
      setPhotos(updated.photos ?? []);
    } catch {
      // error surfaced via addPhotos.isError below
    }
  };

  const handleShareWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400">
          <CheckCircle2 size={20} />
        </div>
        <h2 className="pr-8 text-lg font-bold text-text-primary">Your flat is listed!</h2>
      </div>

      <div className="mt-5 rounded-2xl border border-accent-purple/30 bg-accent-purple/10 px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">
          {"👀 "}
          {nearbyLoading ? (
            "Checking nearby seekers…"
          ) : (
            <>
              <span className="text-accent-purple-light">{nearbyData?.count ?? 0} seekers</span> are looking near
              your flat (within 3km)
            </>
          )}
        </p>
      </div>

      <p className="mt-4 text-sm text-text-primary/90">
        Verify your listing and your pin will be visible to everyone.
      </p>
      <p className="mt-2 text-xs text-text-muted">We'll connect you with matches via email within 24 hours.</p>
      <p className="mt-2 text-xs text-text-muted">*Check your spam folder if you don't see the verification email.</p>

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <Camera size={15} />
          Add photos
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Optional, gets you more interest — Up to 6. They appear once they pass a quick auto-check.
        </p>

        {photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <img key={i} src={src} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        {remainingSlots > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={addPhotos.isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-white/25 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addPhotos.isPending ? "Uploading…" : "+ Add photos"}
          </button>
        )}
        {addPhotos.isError && <p className="mt-2 text-xs text-red-400">Couldn't add photos — try again.</p>}
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-sm font-bold text-text-primary">Help more renters find honest data:</p>
        <textarea
          rows={4}
          value={shareText}
          onChange={(e) => setShareText(e.target.value)}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary focus:outline-none"
        />

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleShareWhatsapp}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-500"
          >
            {"📱 Share on WhatsApp"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-full border border-white/10 bg-surface-alt py-3 text-sm font-bold text-text-primary transition hover:bg-white/5"
          >
            {copied ? "Copied!" : "Copy message"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-text-muted transition hover:text-text-primary"
          >
            Skip
          </button>
        </div>
      </div>
    </Modal>
  );
}
