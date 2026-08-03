import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";

// Standalone route (not a modal) — same page shell as DeleteFlatPage.jsx /
// AboutPage.jsx. Placeholder only: no form, no email link yet.
export default function ContactPage() {
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
            <Mail size={18} />
          </div>
          <h1 className="text-lg font-bold text-text-primary">Contact</h1>
        </div>

        <p className="mt-4 text-sm text-text-muted">Coming soon.</p>
      </div>
    </div>
  );
}
