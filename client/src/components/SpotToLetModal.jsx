import { useRef } from "react";
import { Mail, MapPin, Crosshair, Map as MapIcon, AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";

export default function SpotToLetModal({
  photoDataUrl,
  onPhotoChange,
  name,
  onNameChange,
  message,
  onMessageChange,
  location,
  onUseGps,
  onPickOnMap,
  onSubmit,
  onCancel,
  submitting,
  submitError,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPhotoChange(reader.result);
    reader.readAsDataURL(file);
  };

  const isValid = Boolean(photoDataUrl) && Boolean(location);

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-orange/20 text-accent-orange">
          <Mail size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Spot a To-Let</h2>
          <p className="mt-1 text-sm text-text-muted">
            See a To-Let board? Put it on the map — help the next flat-hunter skip the broker.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
        <p className="text-sm font-semibold text-red-400">
          This feature is temporarily unavailable. We're working on it — please check back soon.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 px-4 py-6 text-center transition hover:border-white/25 hover:bg-white/5"
      >
        {photoDataUrl ? (
          <img src={photoDataUrl} alt="Board" className="h-28 w-full rounded-xl object-cover" />
        ) : (
          <>
            <span className="text-2xl">📷</span>
            <span className="text-sm font-semibold text-text-primary">Tap to snap / upload board photo</span>
          </>
        )}
      </button>
      <p className="mt-2 text-xs text-text-muted">
        ① Shoot just the board — our AI auto-rejects photos with faces or number plates 🙏
      </p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-surface-alt px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <MapPin size={15} className="text-accent-orange" />
          {location ? (
            <span>
              Location set · {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          ) : (
            <span className="text-text-muted">No location set yet</span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onUseGps}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-surface py-2 text-xs font-bold text-text-primary transition hover:bg-white/5"
          >
            <Crosshair size={13} />
            Use GPS
          </button>
          <button
            type="button"
            onClick={onPickOnMap}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-surface py-2 text-xs font-bold text-text-primary transition hover:bg-white/5"
          >
            <MapIcon size={13} />
            Pick on map
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <input
          type="text"
          placeholder="Pick a nickname (shown instead of your name)"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <input
          type="text"
          placeholder="Your message (optional)"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>

      <p className="mt-3 text-xs text-text-muted">
        → both appear on the Superheroes board & on your spotted pin ✨
      </p>

      {submitError && <p className="mt-3 text-sm text-red-400">{submitError}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isValid || submitting}
        className="mt-5 w-full rounded-full bg-accent-orange py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Putting it on the map…" : "📮 Put it on the map"}
      </button>
    </Modal>
  );
}
