import { useState } from "react";
import { Link } from "react-router-dom";
import { Info, ArrowLeft } from "lucide-react";
import LegalModal from "../components/LegalModal.jsx";

const PILL_CLASS =
  "rounded-full border border-white/10 bg-surface-alt px-3.5 py-1.5 text-xs font-semibold text-text-primary transition hover:bg-white/5";

// Standalone route (not a modal) — same page shell as DeleteFlatPage.jsx.
// Privacy Policy / Terms of Use reuse the exact same LegalModal already built
// for LandingCard.jsx rather than duplicating their content here.
export default function AboutPage() {
  const [legalModal, setLegalModal] = useState(null); // 'privacy' | 'terms' | null

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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple-light">
            <Info size={18} />
          </div>
          <h1 className="text-lg font-bold text-text-primary">About</h1>
        </div>

        <p className="mt-4 text-sm text-text-muted">About content coming soon.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setLegalModal("privacy")} className={PILL_CLASS}>
            Privacy Policy
          </button>
          <button type="button" onClick={() => setLegalModal("terms")} className={PILL_CLASS}>
            Terms of Use
          </button>
          <Link to="/contact" className={PILL_CLASS}>
            Contact
          </Link>
          <Link to="/" className={PILL_CLASS}>
            Map
          </Link>
        </div>
      </div>

      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}
