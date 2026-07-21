import Modal from "./Modal.jsx";

export function isOnboardingDismissed(key) {
  if (!key) return false;
  return localStorage.getItem(`onboarding:${key}`) === "1";
}

function dismissOnboarding(key) {
  if (!key) return;
  localStorage.setItem(`onboarding:${key}`, "1");
}

export default function OnboardingModal({
  onClose,
  icon: Icon,
  title,
  subtitle,
  steps = [],
  note,
  ctaLabel = "Got it, let's go",
  onCta,
  dontShowAgainKey,
}) {
  const handleCta = () => {
    if (onCta) onCta();
    else onClose();
  };

  const handleDontShowAgain = () => {
    dismissOnboarding(dontShowAgainKey);
    handleCta();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-purple/20 text-accent-purple-light">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-purple text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm text-text-primary/90">{step}</span>
          </li>
        ))}
      </ol>

      {note && <p className="mt-4 text-xs text-text-muted">{note}</p>}

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCta}
          className="w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light"
        >
          {ctaLabel}
        </button>
        <button
          type="button"
          onClick={handleDontShowAgain}
          className="w-full rounded-full py-3 text-sm font-semibold text-text-muted transition hover:bg-white/5 hover:text-text-primary"
        >
          Don't show again
        </button>
      </div>
    </Modal>
  );
}
