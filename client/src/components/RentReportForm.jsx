import { useState } from "react";
import Modal from "./Modal.jsx";
import TextField from "./ui/TextField.jsx";
import Pill from "./ui/Pill.jsx";
import ToggleButton from "./ui/ToggleButton.jsx";
import SectionLabel from "./ui/SectionLabel.jsx";

const BHK_OPTIONS = [1, 2, 3, 4, 5];

export default function RentReportForm({ onCancel, onSubmit, submitting, submitError }) {
  const [rent, setRent] = useState("");
  const [bhk, setBhk] = useState(null);
  const [gated, setGated] = useState(null); // 'gated' | 'not_gated'

  const isValid = rent !== "" && Number(rent) > 0 && bhk !== null && gated !== null;

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    onSubmit({ rent, bhk, gated });
  };

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-sm">
      <h2 className="text-lg font-bold text-text-primary">What rent are you paying?</h2>
      <p className="mt-1 text-sm text-text-muted">
        Anonymous — no name, no contact info. Just helps everyone see real numbers nearby.
      </p>

      <div className="mt-5 space-y-4">
        <TextField
          label="Monthly rent (Rs.) *"
          prefix="Rs."
          type="number"
          min="0"
          placeholder="e.g. 15000"
          value={rent}
          onChange={(e) => setRent(e.target.value)}
          onWheel={(e) => e.target.blur()}
        />

        <div>
          <SectionLabel>BHK *</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {BHK_OPTIONS.map((n) => (
              <Pill key={n} accent="purple" active={bhk === n} onClick={() => setBhk(n)}>
                {n >= 5 ? "5+" : n}
              </Pill>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Society *</SectionLabel>
          <div className="flex gap-2">
            <ToggleButton accent="purple" active={gated === "gated"} onClick={() => setGated("gated")}>
              Gated
            </ToggleButton>
            <ToggleButton accent="purple" active={gated === "not_gated"} onClick={() => setGated("not_gated")}>
              Not Gated
            </ToggleButton>
          </div>
        </div>
      </div>

      {submitError && <p className="mt-3 text-sm text-red-400">{submitError}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="mt-6 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "Submit anonymously"}
      </button>
    </Modal>
  );
}
