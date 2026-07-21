import { X } from "lucide-react";

export default function Modal({ onClose, children, maxWidthClass = "max-w-md" }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClass} rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-text-muted transition hover:bg-white/10 hover:text-text-primary"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
