import { ShieldCheck, FileText } from "lucide-react";
import Modal from "./Modal.jsx";

// Placeholder shell for Privacy Policy / Terms of Use — real legal copy is a
// follow-up task; this just gets the modal (heading, scrollable body, close
// button) fully built and wired so dropping in real text later is a
// content-only change. Built on Modal.jsx (same shell as AuthGateModal.jsx:
// icon circle + title, X top-right from Modal itself, full-width bottom
// button) rather than new modal chrome.
const LEGAL_CONTENT = {
  privacy: {
    icon: ShieldCheck,
    title: "Privacy Policy",
    placeholder: "Privacy Policy content coming soon.",
  },
  terms: {
    icon: FileText,
    title: "Terms of Use",
    placeholder: "Terms of Use content coming soon.",
  },
};

export default function LegalModal({ type, onClose }) {
  const { icon: Icon, title, placeholder } = LEGAL_CONTENT[type];

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-purple/20 text-accent-purple-light">
          <Icon size={22} />
        </div>
        <h2 className="pr-8 text-lg font-bold text-text-primary">{title}</h2>
      </div>

      <p className="mt-5 text-sm text-text-muted">{placeholder}</p>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light"
      >
        Close
      </button>
    </Modal>
  );
}
