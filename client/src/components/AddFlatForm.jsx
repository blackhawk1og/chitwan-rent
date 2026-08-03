import { useState } from "react";
import { Sofa, Box, ShieldCheck, ShieldOff, Users, User, AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";
import Switch from "./Switch.jsx";
import Pill from "./ui/Pill.jsx";
import ToggleButton from "./ui/ToggleButton.jsx";
import SectionLabel from "./ui/SectionLabel.jsx";
import TextField from "./ui/TextField.jsx";
import RentCapConfirmModal from "./RentCapConfirmModal.jsx";
import { bhkLabel } from "../lib/format.js";

const BHK_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5+" },
];

const PETS_OPTIONS = [
  { value: "yes", label: "Yes", emoji: "🐕" },
  { value: "no", label: "No", emoji: "🚫" },
  { value: "not_sure", label: "Not sure", emoji: "🤷" },
];

// Flat, BHK-based caps only — no percentage or furnished/gated/parking
// multipliers. Soft warning: informational only, never blocks submission.
const RENT_CAPS = { 1: 15000, 2: 30000, 3: 45000, 4: 60000, 5: 100000 };

function getRentCap(bhk) {
  if (bhk === null) return null;
  return RENT_CAPS[bhk] ?? RENT_CAPS[5];
}

const initialForm = {
  bhk: null,
  rent: "",
  furnishing: null,
  includesMaintenance: false,
  gated: null,
  whoLives: null,
  deposit: "",
  petsAllowed: null,
  parkingFor: "",
  sqft: "",
  societyName: "",
  description: "",
  oneLiner: "",
};

export default function AddFlatForm({ onCancel, onSubmit, submitting, submitError, area }) {
  const [form, setForm] = useState(initialForm);
  const [showRentCapConfirm, setShowRentCapConfirm] = useState(false);
  const [ceilingBlockAttempted, setCeilingBlockAttempted] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const isValid =
    form.bhk !== null &&
    form.rent !== "" &&
    form.furnishing !== null &&
    form.gated !== null &&
    form.parkingFor !== "" &&
    form.societyName !== "";

  const rentCap = getRentCap(form.bhk);
  const rentNum = Number(form.rent);
  const rentCapWarning =
    rentCap !== null && form.rent !== "" && Number.isFinite(rentNum) && rentNum > rentCap
      ? `Rent seems too high — maximum is ₹${rentCap.toLocaleString("en-IN")}/month`
      : null;

  // Absolute ceiling: more than double the BHK's cap. No confirm/override
  // path at this tier — Proceed just refuses and explains why, form intact.
  const rentCeiling = rentCap !== null ? rentCap * 2 : null;
  const isOverRentCeiling =
    rentCeiling !== null && form.rent !== "" && Number.isFinite(rentNum) && rentNum > rentCeiling;

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    if (isOverRentCeiling) {
      setCeilingBlockAttempted(true);
      return;
    }
    if (rentCapWarning) {
      setShowRentCapConfirm(true);
      return;
    }
    onSubmit(form);
  };

  const handleReCheckRent = () => setShowRentCapConfirm(false);

  const handleConfirmFlaggedRent = () => {
    setShowRentCapConfirm(false);
    onSubmit({ ...form, rentFlagged: true });
  };

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Add Your Flat</h2>
        <p className="mt-1 text-sm text-text-muted">Fill in the details — takes less than a minute.</p>
        <p className="mt-2 text-xs font-semibold text-accent-purple-light">📍 {area || "Locating…"}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        {/* Card 1 */}
        <div className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-surface-alt/40 p-5">
          <div>
            <SectionLabel>Bedrooms (BHK) *</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {BHK_OPTIONS.map((opt) => (
                <Pill key={opt.value} active={form.bhk === opt.value} onClick={() => set({ bhk: opt.value })}>
                  {opt.label}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <TextField
              label="Monthly Rent (Rs.) *"
              prefix="Rs."
              type="number"
              min="0"
              placeholder="e.g. 12000"
              value={form.rent}
              onChange={(e) => set({ rent: e.target.value })}
              onWheel={(e) => e.target.blur()}
            />
            {rentCapWarning && <p className="mt-1.5 text-xs font-semibold text-red-400">{rentCapWarning}</p>}
          </div>

          <div>
            <SectionLabel>Furnishing *</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton icon={Sofa} active={form.furnishing === "furnished"} onClick={() => set({ furnishing: "furnished" })}>
                Furnished
              </ToggleButton>
              <ToggleButton icon={Box} active={form.furnishing === "unfurnished"} onClick={() => set({ furnishing: "unfurnished" })}>
                Unfurnished
              </ToggleButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary">Includes Maintenance</div>
              <div className="text-xs text-text-muted">Is maintenance bundled in rent?</div>
            </div>
            <Switch
              checked={form.includesMaintenance}
              onChange={(v) => set({ includesMaintenance: v })}
              label="Includes maintenance"
            />
          </div>

          <div>
            <SectionLabel>Gated Society *</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton icon={ShieldCheck} active={form.gated === "gated"} onClick={() => set({ gated: "gated" })}>
                Gated
              </ToggleButton>
              <ToggleButton icon={ShieldOff} active={form.gated === "not_gated"} onClick={() => set({ gated: "not_gated" })}>
                Not Gated
              </ToggleButton>
            </div>
          </div>

          <div>
            <SectionLabel>Who lives here? (optional)</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton icon={Users} active={form.whoLives === "family"} onClick={() => set({ whoLives: form.whoLives === "family" ? null : "family" })}>
                Family
              </ToggleButton>
              <ToggleButton icon={User} active={form.whoLives === "bachelor"} onClick={() => set({ whoLives: form.whoLives === "bachelor" ? null : "bachelor" })}>
                Bachelor
              </ToggleButton>
            </div>
          </div>

          <TextField
            label="Deposit paid (optional)"
            prefix="Rs."
            type="number"
            min="0"
            placeholder="e.g. 24000"
            value={form.deposit}
            onChange={(e) => set({ deposit: e.target.value })}
          />
        </div>

        {/* Card 2 */}
        <div className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-surface-alt/40 p-5">
          <div>
            <SectionLabel>Pets allowed? (optional)</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {PETS_OPTIONS.map((opt) => (
                <Pill
                  key={opt.value}
                  active={form.petsAllowed === opt.value}
                  onClick={() => set({ petsAllowed: form.petsAllowed === opt.value ? null : opt.value })}
                >
                  {opt.emoji} {opt.label}
                </Pill>
              ))}
            </div>
          </div>

          <TextField
            label="Parking for *"
            suffix="cars"
            type="number"
            min="0"
            placeholder="0"
            value={form.parkingFor}
            onChange={(e) => set({ parkingFor: e.target.value })}
            helper="Enter 0 if there's no parking. 1 for one spot, 2 for two, and so on."
          />

          <TextField
            label="Square Footage (optional)"
            suffix="sq.ft"
            type="number"
            min="0"
            placeholder="e.g. 650"
            value={form.sqft}
            onChange={(e) => set({ sqft: e.target.value })}
          />

          <TextField
            label="Society / Building Name *"
            type="text"
            placeholder="e.g. Sobha Dream Acres"
            value={form.societyName}
            onChange={(e) => set({ societyName: e.target.value })}
            helper="This helps others know where to look when they're interested"
          />

          <TextField
            label="Flat description (optional)"
            type="text"
            placeholder="2 bedrooms +1 kitchen"
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />

          <TextField
            label="One-liner on the stay (optional)"
            type="text"
            placeholder="e.g. Great locality, calm neighbourhood"
            value={form.oneLiner}
            onChange={(e) => set({ oneLiner: e.target.value })}
          />
        </div>
      </div>

      {submitError && <p className="mt-4 text-sm text-red-400">{submitError}</p>}

      {ceilingBlockAttempted && isOverRentCeiling && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm font-semibold text-red-400">
            This rent is more than double the typical maximum for a {bhkLabel(form.bhk)} (₹
            {rentCeiling?.toLocaleString("en-IN")}) and can't be accepted. Please lower the amount to continue.
          </p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-white/10 bg-surface-alt py-3 text-sm font-bold text-text-primary transition hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="flex-1 rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Posting…" : "Proceed →"}
        </button>
      </div>

      {showRentCapConfirm && (
        <RentCapConfirmModal
          rent={form.rent}
          bhk={form.bhk}
          cap={rentCap}
          onReCheck={handleReCheckRent}
          onConfirm={handleConfirmFlaggedRent}
        />
      )}
    </Modal>
  );
}
