import { Map as MapIcon } from "lucide-react";
import Modal from "./Modal.jsx";

export default function OutOfBoundsModal({ onClose }) {
  return (
    <Modal onClose={onClose} maxWidthClass="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-purple/20 text-accent-purple-light">
          <MapIcon size={26} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-text-primary">Only live for Chitwan right now</h2>
        <p className="mt-2 text-sm text-text-muted">
          This pin is more than 100 km from Chitwan. chitwan.rent is currently focused on the Chitwan district only.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light"
      >
        Got it
      </button>
    </Modal>
  );
}
