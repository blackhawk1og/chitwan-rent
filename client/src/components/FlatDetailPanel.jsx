import { useState } from "react";
import {
  Share2,
  Flag,
  X,
  Home,
  ShieldCheck,
  ShieldOff,
  Users,
  PawPrint,
  Armchair,
  Wallet,
  Maximize2,
  Clock,
  Map as MapIcon,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import SlidePanel from "./SlidePanel.jsx";
import Modal from "./Modal.jsx";
import PhotoCarousel from "./PhotoCarousel.jsx";
import InterestForm from "./InterestForm.jsx";
import CommentsSection from "./CommentsSection.jsx";
import AuthGateModal from "./AuthGateModal.jsx";
import { StarRatingDisplay, StarRatingInput } from "./StarRating.jsx";
import { formatRs, bhkLabel, formatRelativeTime } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRateFlat } from "../hooks/useRateFlat.js";
import { useFlatInterest } from "../hooks/useFlatInterest.js";

const PETS_LABEL = { yes: "Pets OK", no: "Not Allowed", not_sure: "Pets: Not Sure" };
const WHO_LIVES_LABEL = { family: "Family", bachelor: "Bachelor" };
const BANNER_COPY = {
  flat: "Owner is looking to rent the whole flat",
  flatmate: "Owner is looking for a flatmate to share this flat",
};

const PILL_TONE = {
  neutral: "border-white/10 bg-surface-alt text-text-primary",
  teal: "border-accent-teal/30 bg-accent-teal/10 text-accent-teal",
  purple: "border-accent-purple/30 bg-accent-purple/10 text-accent-purple-light",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

function Pill({ icon: Icon, tone = "neutral", children }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${PILL_TONE[tone]}`}
    >
      {Icon && <Icon size={13} />}
      {children}
    </span>
  );
}

export default function FlatDetailPanel({ flat, onClose }) {
  const { isAuthenticated } = useAuth();
  const rateFlat = useRateFlat(flat.id);
  const flatInterest = useFlatInterest(flat.id);

  const [shareCopied, setShareCopied] = useState(false);
  const [reported, setReported] = useState(false);
  const [sqftUnit, setSqftUnit] = useState("ft");

  const [authGate, setAuthGate] = useState(null); // 'rating' | 'interest' | 'comment' | null
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [pendingStars, setPendingStars] = useState(0);
  const [interestFormOpen, setInterestFormOpen] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [localRating, setLocalRating] = useState(null);
  const displayedRating = localRating ?? flat.rating;

  const bannerText = BANNER_COPY[flat.listing_type] ?? BANNER_COPY.flat;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${flat.lat},${flat.lng}`;
  const sqftDisplay = flat.sqft
    ? sqftUnit === "ft"
      ? `${flat.sqft} sq.ft`
      : `${(flat.sqft * 0.092903).toFixed(1)} sq.m`
    : "—";
  const relTime = formatRelativeTime(flat.posted_at);
  const postedLabel = relTime === "just now" ? relTime : `${relTime} ago`;

  const handleShare = async () => {
    const shareData = {
      title: `${bhkLabel(flat.bhk)} in ${flat.area}`,
      text: `${bhkLabel(flat.bhk)} · ${formatRs(flat.rent)}/mo in ${flat.area}`,
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

  const openRating = () => {
    if (!isAuthenticated) {
      setAuthGate("rating");
      return;
    }
    setPendingStars(0);
    setRatingModalOpen(true);
  };

  const openInterest = () => {
    if (!isAuthenticated) {
      setAuthGate("interest");
      return;
    }
    setInterestFormOpen(true);
  };

  const handleAuthSuccess = () => {
    const target = authGate;
    setAuthGate(null);
    if (target === "rating") {
      setPendingStars(0);
      setRatingModalOpen(true);
    } else if (target === "interest") {
      setInterestFormOpen(true);
    }
  };

  const handleSubmitRating = () => {
    if (!pendingStars) return;
    rateFlat.mutate(pendingStars, {
      onSuccess: (data) => {
        setLocalRating(data.rating);
        setRatingModalOpen(false);
      },
    });
  };

  const handleSubmitInterest = (form) => {
    flatInterest.mutate(form, {
      onSuccess: () => {
        setInterestFormOpen(false);
        setInterestSent(true);
      },
    });
  };

  return (
    <>
      <SlidePanel onClose={onClose}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-surface/95 px-5 py-4 backdrop-blur-md">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Monthly Rent</div>
            <div className="text-2xl font-extrabold text-text-primary">{formatRs(flat.rent)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-text-muted transition hover:bg-white/10 hover:text-text-primary"
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setReported(true)}
              aria-label="Report listing"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                reported
                  ? "bg-red-500/20 text-red-400"
                  : "bg-surface-alt text-text-muted hover:bg-white/10 hover:text-text-primary"
              }`}
            >
              <Flag size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-text-muted transition hover:bg-white/10 hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {shareCopied && <p className="px-5 pt-2 text-xs text-accent-teal">Link copied to clipboard</p>}
        {reported && <p className="px-5 pt-2 text-xs text-red-400">Reported — thanks, we'll take a look.</p>}

        <div className="px-5 pb-8 pt-4">
          <PhotoCarousel photos={flat.photos ?? []} />

          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-accent-teal/15 px-4 py-3 text-sm font-semibold text-accent-teal">
            <Home size={16} className="shrink-0" />
            {bannerText}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill icon={Home} tone="purple">
              {bhkLabel(flat.bhk)}
            </Pill>
            <Pill icon={Armchair}>{flat.furnishing === "furnished" ? "Furnished" : "Unfurnished"}</Pill>
            <Pill icon={Wallet} tone={flat.includes_maintenance ? "teal" : "amber"}>
              {flat.includes_maintenance ? "Maintenance Included" : "Maintenance Extra"}
            </Pill>
            <Pill icon={flat.gated === "gated" ? ShieldCheck : ShieldOff} tone={flat.gated === "gated" ? "teal" : "neutral"}>
              {flat.gated === "gated" ? "Gated" : "Not Gated"}
            </Pill>
            {flat.who_lives && <Pill icon={Users}>{WHO_LIVES_LABEL[flat.who_lives]}</Pill>}
            {flat.pets_allowed && (
              <Pill icon={PawPrint} tone={flat.pets_allowed === "yes" ? "teal" : "rose"}>
                {PETS_LABEL[flat.pets_allowed]}
              </Pill>
            )}
          </div>

          <div className="mt-4 text-sm text-text-muted">
            Society: <span className="font-semibold text-text-primary">{flat.area || "Independent"}</span>
          </div>

          {flat.one_liner && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Tenant said</div>
              <p className="mt-1.5 text-sm italic text-text-primary/90">"{flat.one_liner}"</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
            <button
              type="button"
              onClick={() => setSqftUnit((u) => (u === "ft" ? "m" : "ft"))}
              className="flex items-center gap-1.5 transition hover:text-text-primary"
            >
              <Maximize2 size={14} />
              {sqftDisplay}
            </button>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              Pinned {postedLabel}
            </span>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-accent-teal transition hover:underline"
            >
              <MapIcon size={14} />
              Get directions
            </a>
          </div>

          <button
            type="button"
            onClick={openInterest}
            className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-accent-teal/30 bg-accent-teal/10 p-4 text-left transition hover:bg-accent-teal/15"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-teal text-white">
              <Home size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-text-primary">I'm interested in this flat</div>
              <div className="mt-0.5 text-xs text-text-muted">
                Share your preferences — we'll email the owner with your details and also match you against other
                nearby flats.
              </div>
            </div>
            <ArrowRight size={18} className="shrink-0 text-accent-teal" />
          </button>
          {interestSent && (
            <p className="mt-2 text-xs text-accent-teal">Thanks! We've noted your interest and will be in touch.</p>
          )}

          <button
            type="button"
            onClick={openRating}
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 bg-surface-alt px-4 py-3 text-left transition hover:bg-white/5"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Community Rating</span>
            {displayedRating != null ? (
              <span className="flex items-center gap-2">
                <StarRatingDisplay value={displayedRating} />
                <span className="text-sm font-bold text-text-primary">{Number(displayedRating).toFixed(1)}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                No ratings yet — tap to rate
                <ChevronRight size={14} />
              </span>
            )}
          </button>

          <CommentsSection
            flatId={flat.id}
            isAuthenticated={isAuthenticated}
            onNeedAuth={() => setAuthGate("comment")}
          />
        </div>
      </SlidePanel>

      {ratingModalOpen && (
        <Modal onClose={() => setRatingModalOpen(false)} maxWidthClass="max-w-xs">
          <h2 className="text-lg font-bold text-text-primary">Rate this flat</h2>
          <p className="mt-1 text-sm text-text-muted">How would you rate your experience?</p>
          <div className="mt-5 flex justify-center">
            <StarRatingInput value={pendingStars} onChange={setPendingStars} />
          </div>
          {rateFlat.isError && (
            <p className="mt-3 text-center text-sm text-red-400">Something went wrong — please try again.</p>
          )}
          <button
            type="button"
            onClick={handleSubmitRating}
            disabled={!pendingStars || rateFlat.isPending}
            className="mt-5 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {rateFlat.isPending ? "Submitting…" : "Submit rating"}
          </button>
        </Modal>
      )}

      {interestFormOpen && (
        <InterestForm
          onCancel={() => setInterestFormOpen(false)}
          onSubmit={handleSubmitInterest}
          submitting={flatInterest.isPending}
          submitError={flatInterest.isError ? "Something went wrong — please try again." : null}
        />
      )}

      {authGate && <AuthGateModal onSuccess={handleAuthSuccess} onCancel={() => setAuthGate(null)} />}
    </>
  );
}
