import { useLayoutEffect, useState } from "react";

const SEEN_KEY = "how-to-use-tour-seen";

export function isHowToUseTourSeen() {
  return localStorage.getItem(SEEN_KEY) === "1";
}

function markHowToUseTourSeen() {
  localStorage.setItem(SEEN_KEY, "1");
}

// Each step's `selector` targets a `data-tour="..."` attribute added to the
// real UI element being explained (see TopNavPill.jsx / IconStack.jsx /
// MapShell.jsx) — null means "no spotlight, plain centered card" (step 1,
// which explains tapping empty map space rather than any specific control).
const STEPS = [
  {
    selector: null,
    title: "Tap the map. Add anything.",
    bullets: [
      "Tap any empty spot and choose what to add: your rent (anonymous, 10s), your flat, or a seeker pin",
      "Looking for a flat? Tap pins for details — express interest and we'll pass it to the owner",
    ],
  },
  {
    selector: '[data-tour="spot-to-let"]',
    title: "See a To-Let board? Snap it.",
    bullets: [
      "Photograph any To-Let board you pass — its photo + phone number go live on the map",
      "No broker, ever. Top spotters climb the Superheroes board",
    ],
  },
  {
    selector: '[data-tour="search-bar"]',
    title: "Find your flat",
    bullets: [
      "Type any neighbourhood, area, or society to jump there",
      "Filter by BHK, rent range, furnishing, gated societies, how recently posted, or near a bus route",
    ],
  },
  {
    selector: '[data-tour="nav-pill-row"]',
    title: "Single-tap access to anything you'll need",
    bullets: [
      "🏠 Avlb Flats — see what's up for rent now",
      "🔍 Find a Flat — drop a seeker pin, get matched",
      "🔑 List My Flat — list direct, zero brokerage",
      "🦸 Superheroes — see who's spotting the most To-Let boards",
    ],
  },
  {
    selector: '[data-tour="icon-stack-rest"]',
    title: "See Chitwan your way",
    bullets: [
      "🛰️ Satellite — actual buildings, not abstract",
      "🚌 Bus Routes — see Chitwan's bus lines at a glance",
      "🎓 Schools — colleges and schools around any flat",
      "🧰 More — locate me, hide pins, or draw an area for its avg rent",
    ],
  },
  {
    selector: '[data-tour="how-to-use-pill"]',
    title: `Lost? Tap "How to use" anytime`,
    // No feedback/contact bullet — this codebase has no feedback or contact
    // mechanism to point to (checked before writing this), so a would-be
    // second bullet is dropped instead of inventing one.
    bullets: [`Tap "How to use" to replay this tour whenever you need it`],
  },
];

const SPOTLIGHT_PAD = 10;
const CARD_GAP = 14;
const CARD_MARGIN = 16;
const CARD_WIDTH = 340;
// Below this much room underneath the spotlighted element, flip the card
// to sit above it instead — matches the card's typical rendered height
// (title + up to 4 bullets + footer) closely enough without needing to
// measure the card itself before its first paint.
const MIN_SPACE_BELOW = 240;

// First-time-visitor guided tour: a dimmed backdrop with a cutout
// "spotlight" around the real UI element each step is explaining, plus a
// step card positioned near it. Reopened on demand any time via the
// existing "How to use" nav pill (see MapShell.jsx) — entirely separate
// from OnboardingModal.jsx's own per-flow (List My Flat / Find a Flat)
// onboarding steps, which this does not touch.
export default function HowToUseTour({ onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  useLayoutEffect(() => {
    if (!step.selector) {
      setRect(null);
      return undefined;
    }
    const measure = () => {
      // querySelectorAll + last match, not querySelector's first match: the
      // "how-to-use" pill also exists inside TopNavPill's hidden always-
      // mounted width-measurement clone (see navMeasureRef in MapShell.jsx),
      // which renders before the real, visible row in DOM order and would
      // otherwise be the one picked (anchoring the spotlight at that
      // clone's fixed top-left position instead of the real pill).
      const matches = document.querySelectorAll(step.selector);
      const el = matches[matches.length - 1];
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    // Layout can settle a frame late (e.g. right after a route change
    // mounts the target element) — one extra measure catches that.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [step.selector]);

  const finish = () => {
    markHowToUseTourSeen();
    onClose();
  };

  const handleNext = () => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };

  const handleBack = () => setStepIndex((i) => Math.max(0, i - 1));

  let cardStyle = null;
  if (rect) {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const placeAbove = viewportH - rect.bottom < MIN_SPACE_BELOW && rect.top > MIN_SPACE_BELOW;

    let left = rect.left;
    if (left + CARD_WIDTH + CARD_MARGIN > viewportW) left = viewportW - CARD_WIDTH - CARD_MARGIN;
    if (left < CARD_MARGIN) left = CARD_MARGIN;

    cardStyle = placeAbove
      ? { left, bottom: viewportH - rect.top + CARD_GAP, width: CARD_WIDTH }
      : { left, top: rect.bottom + CARD_GAP, width: CARD_WIDTH };
  }

  const card = (
    <div
      className={
        rect
          ? "absolute rounded-3xl border border-white/10 bg-surface p-5 shadow-2xl"
          : "absolute left-1/2 top-1/2 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-surface p-5 shadow-2xl"
      }
      style={cardStyle ?? undefined}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-accent-purple-light">
        Step {stepIndex + 1} of {STEPS.length}
      </div>
      <h2 className="mt-1 text-lg font-bold text-text-primary">{step.title}</h2>
      <ul className="mt-3 space-y-1.5">
        {step.bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2 text-sm text-text-primary/90">
            <span className="text-text-muted">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={finish}
          className="text-sm font-semibold text-text-muted transition hover:text-text-primary"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border border-white/10 bg-surface-alt px-4 py-2.5 text-sm font-bold text-text-primary transition hover:bg-white/5"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full bg-accent-purple px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent-purple-light"
          >
            {isLast ? "Done ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2100]">
      {rect ? (
        <>
          {/* Four dimming panels framing a rectangular cutout around the
              real element, rather than a single full-screen overlay + mask
              — simplest way to keep the spotlighted element itself
              completely untouched (still its real DOM node, still really
              clickable) instead of drawing a copy of it on top. */}
          <div
            className="absolute inset-x-0 top-0 bg-black/75"
            style={{ height: Math.max(rect.top - SPOTLIGHT_PAD, 0) }}
            onClick={finish}
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/75" style={{ top: rect.bottom + SPOTLIGHT_PAD }} onClick={finish} />
          <div
            className="absolute bg-black/75"
            style={{
              top: rect.top - SPOTLIGHT_PAD,
              height: rect.height + SPOTLIGHT_PAD * 2,
              left: 0,
              width: Math.max(rect.left - SPOTLIGHT_PAD, 0),
            }}
            onClick={finish}
          />
          <div
            className="absolute bg-black/75"
            style={{ top: rect.top - SPOTLIGHT_PAD, height: rect.height + SPOTLIGHT_PAD * 2, left: rect.right + SPOTLIGHT_PAD, right: 0 }}
            onClick={finish}
          />
          <div
            className="pointer-events-none absolute rounded-2xl ring-2 ring-accent-purple-light/70"
            style={{
              top: rect.top - SPOTLIGHT_PAD,
              left: rect.left - SPOTLIGHT_PAD,
              width: rect.width + SPOTLIGHT_PAD * 2,
              height: rect.height + SPOTLIGHT_PAD * 2,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/75" onClick={finish} />
      )}
      {card}
    </div>
  );
}
