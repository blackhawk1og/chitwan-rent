import { useState } from "react";
import { User, UserRound, Users, Car } from "lucide-react";
import Modal from "./Modal.jsx";
import Pill from "./ui/Pill.jsx";
import ToggleButton from "./ui/ToggleButton.jsx";
import SectionLabel from "./ui/SectionLabel.jsx";
import TextField from "./ui/TextField.jsx";
import { isValidEmail, isValidPhone, sanitizePhoneInput } from "../lib/validation.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

// Same 3 options/labels as ListFlatDetailsForm.jsx's "Available from" Pill
// selector — reused here as-is, just under this form's own "Move-in
// Timeline" label per this feature's spec.
const MOVE_IN_OPTIONS = [
  { value: "asap", label: "ASAP" },
  { value: "next_month", label: "Next month" },
  { value: "flexible", label: "Flexible" },
];

export default function InterestForm({ onCancel, onSubmit, submitting, submitError }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  // Optional, lighter-weight fields — collected but not (yet) wired into
  // flats/seeker_pins/matching, per this feature's own scope. All three
  // default to "no selection", same as DropSeekerPinForm.jsx's own
  // moveIn/gender/parkingRequired defaults, so submitting without touching
  // any of them is always valid.
  const [moveIn, setMoveIn] = useState(null); // 'asap' | 'next_month' | 'flexible' | null
  const [gender, setGender] = useState(null); // 'male' | 'female' | 'other' | null
  const [parkingRequired, setParkingRequired] = useState(false);
  const [parkingCount, setParkingCount] = useState(""); // string, same numeric-TextField convention as AddFlatForm.jsx's parkingFor

  const debouncedEmail = useDebouncedValue(email);
  const debouncedPhone = useDebouncedValue(phone);
  const emailError = debouncedEmail !== "" && !isValidEmail(debouncedEmail) ? "Enter a valid email address" : null;
  const phoneError = debouncedPhone !== "" && !isValidPhone(debouncedPhone) ? "Enter a valid 10-digit mobile number" : null;
  // "name" removed from both the field list and this check — email/phone are
  // the only two fields still required, unchanged from before.
  const isValid = isValidEmail(email) && isValidPhone(phone);

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    onSubmit({
      email: email.trim(),
      phone,
      note: note.trim() || null,
      moveIn,
      gender,
      parkingRequired,
      // Only meaningful when parking is actually required — stays null
      // otherwise even if something was typed in before switching back to
      // "No preference" (cleared there, see that button's onClick).
      parkingCount: parkingRequired && parkingCount !== "" ? Number(parkingCount) : null,
    });
  };

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-sm">
      <h2 className="text-lg font-bold text-text-primary">I'm interested in this flat</h2>
      <p className="mt-1 text-sm text-text-muted">
        Share your preferences — we'll email your details straight to the owner.
      </p>

      <div className="mt-5 space-y-3">
        <TextField
          label="Email *"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        <TextField
          label="Phone *"
          type="tel"
          inputMode="numeric"
          placeholder="98XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
          error={phoneError}
        />

        <div>
          <SectionLabel>Move-in Timeline</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {MOVE_IN_OPTIONS.map((opt) => (
              <Pill
                key={opt.value}
                accent="teal"
                active={moveIn === opt.value}
                onClick={() => setMoveIn(moveIn === opt.value ? null : opt.value)}
              >
                {opt.label}
              </Pill>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>You are (optional but helps matching)</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <ToggleButton accent="teal" icon={User} active={gender === "male"} onClick={() => setGender(gender === "male" ? null : "male")}>
              Male
            </ToggleButton>
            <ToggleButton accent="teal" icon={UserRound} active={gender === "female"} onClick={() => setGender(gender === "female" ? null : "female")}>
              Female
            </ToggleButton>
            <ToggleButton accent="teal" icon={Users} active={gender === "other"} onClick={() => setGender(gender === "other" ? null : "other")}>
              Other
            </ToggleButton>
          </div>
        </div>

        <div>
          <SectionLabel>🚗 Parking required?</SectionLabel>
          <div className="flex gap-2">
            <ToggleButton accent="teal" icon={Car} active={parkingRequired === true} onClick={() => setParkingRequired(true)}>
              Yes, need parking
            </ToggleButton>
            <ToggleButton
              accent="teal"
              active={parkingRequired === false}
              onClick={() => {
                setParkingRequired(false);
                setParkingCount("");
              }}
            >
              No preference
            </ToggleButton>
          </div>
          {/* Same numeric TextField pattern as AddFlatForm.jsx's "Parking
              for" field — only shown once parking is actually requested, so
              this optional form doesn't ask a follow-up nobody needs. */}
          {parkingRequired && (
            <div className="mt-2.5">
              <TextField
                label="Number of parking spots (optional)"
                suffix="cars"
                type="number"
                min="0"
                placeholder="e.g. 1"
                value={parkingCount}
                onChange={(e) => setParkingCount(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-primary">One-line note (optional)</label>
          <textarea
            rows={2}
            placeholder="e.g. Looking to move in next month"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-none rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {submitError && <p className="mt-3 text-sm text-red-400">{submitError}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="mt-5 w-full rounded-full bg-accent-teal py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Sending…" : "Send interest"}
      </button>
    </Modal>
  );
}
