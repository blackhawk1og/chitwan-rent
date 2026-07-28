import { useState } from "react";
import { Utensils, Cigarette, User, Users, UserRound } from "lucide-react";
import Modal from "./Modal.jsx";
import Pill from "./ui/Pill.jsx";
import ToggleButton from "./ui/ToggleButton.jsx";
import SectionLabel from "./ui/SectionLabel.jsx";
import TextField from "./ui/TextField.jsx";
import { isValidEmail, isValidPhone, sanitizePhoneInput } from "../lib/validation.js";

const AVAILABLE_FROM_OPTIONS = [
  { value: "asap", label: "ASAP" },
  { value: "next_month", label: "Next month" },
  { value: "flexible", label: "Flexible" },
];

const initialForm = {
  availableFrom: "asap",
  flatmateGenderPref: null,
  foodPref: null,
  smokerOk: null,
  email: "",
  phone: "",
};

// onBack (the "Cancel" button) returns to the branch-choice step, preserving
// everything entered so far — onClose (the modal's own "×") exits the whole
// flow back to the map instead. Distinct actions, not aliases of each other.
export default function ListFlatDetailsForm({
  mode,
  rentLabel,
  bhkLabel,
  onBack,
  onClose,
  onSubmit,
  submitting,
  submitError,
}) {
  const [form, setForm] = useState(initialForm);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const isFlatmate = mode === "flatmate";
  const emailError = form.email !== "" && !isValidEmail(form.email) ? "Enter a valid email address" : null;
  const phoneError = form.phone !== "" && !isValidPhone(form.phone) ? "Enter a valid 10-digit mobile number" : null;
  const isValid =
    form.availableFrom !== null &&
    isValidEmail(form.email) &&
    isValidPhone(form.phone);

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    onSubmit(form);
  };

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <h2 className="pr-8 text-xl font-bold text-text-primary">{isFlatmate ? "List a Room" : "List Whole Flat"}</h2>
      <p className="mt-1.5 text-sm font-semibold text-accent-orange">
        Your pin: {rentLabel} · {bhkLabel}
      </p>

      <blockquote className="mt-5 rounded-xl border border-white/10 bg-surface-alt px-4 py-3 text-sm italic text-text-primary/90">
        "I was able to find tenants quickly without paying any brokerage. Simple to use and very effective."
        <footer className="mt-1.5 text-xs not-italic text-text-muted">— Nithin · listed his flat</footer>
      </blockquote>

      <div className="mt-5 space-y-5">
        <div>
          <SectionLabel>Available from *</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_FROM_OPTIONS.map((opt) => (
              <Pill
                key={opt.value}
                accent="teal"
                active={form.availableFrom === opt.value}
                onClick={() => set({ availableFrom: opt.value })}
              >
                {opt.label}
              </Pill>
            ))}
          </div>
        </div>

        {isFlatmate && (
          <>
            <div>
              <SectionLabel>What gender flatmate are you comfortable with?</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <ToggleButton
                  accent="teal"
                  icon={User}
                  active={form.flatmateGenderPref === "male"}
                  onClick={() => set({ flatmateGenderPref: form.flatmateGenderPref === "male" ? null : "male" })}
                >
                  Male
                </ToggleButton>
                <ToggleButton
                  accent="teal"
                  icon={UserRound}
                  active={form.flatmateGenderPref === "female"}
                  onClick={() => set({ flatmateGenderPref: form.flatmateGenderPref === "female" ? null : "female" })}
                >
                  Female
                </ToggleButton>
                <ToggleButton
                  accent="teal"
                  icon={Users}
                  active={form.flatmateGenderPref === "any"}
                  onClick={() => set({ flatmateGenderPref: form.flatmateGenderPref === "any" ? null : "any" })}
                >
                  Any
                </ToggleButton>
              </div>
            </div>

            <div>
              <SectionLabel>Food preference in flatmate</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <ToggleButton
                  accent="teal"
                  icon={Utensils}
                  active={form.foodPref === "veg"}
                  onClick={() => set({ foodPref: form.foodPref === "veg" ? null : "veg" })}
                >
                  Veg
                </ToggleButton>
                <ToggleButton
                  accent="teal"
                  icon={Utensils}
                  active={form.foodPref === "non_veg"}
                  onClick={() => set({ foodPref: form.foodPref === "non_veg" ? null : "non_veg" })}
                >
                  Non-veg
                </ToggleButton>
                <ToggleButton
                  accent="teal"
                  icon={Utensils}
                  active={form.foodPref === "any"}
                  onClick={() => set({ foodPref: form.foodPref === "any" ? null : "any" })}
                >
                  Any
                </ToggleButton>
              </div>
            </div>

            <div>
              <SectionLabel>Okay with a flatmate who smokes?</SectionLabel>
              <div className="flex gap-2">
                <ToggleButton
                  accent="teal"
                  icon={Cigarette}
                  active={form.smokerOk === "smoker"}
                  onClick={() => set({ smokerOk: form.smokerOk === "smoker" ? null : "smoker" })}
                >
                  Smoker OK
                </ToggleButton>
                <ToggleButton
                  accent="teal"
                  icon={Cigarette}
                  active={form.smokerOk === "non_smoker"}
                  onClick={() => set({ smokerOk: form.smokerOk === "non_smoker" ? null : "non_smoker" })}
                >
                  Non-smoker only
                </ToggleButton>
              </div>
            </div>
          </>
        )}

        <TextField
          label="Your email *"
          type="email"
          placeholder="you@gmail.com"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          error={emailError}
        />

        <TextField
          label="Phone number *"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile"
          value={form.phone}
          onChange={(e) => set({ phone: sanitizePhoneInput(e.target.value) })}
          error={phoneError}
          helper="Private — only shared with matched seekers."
        />
      </div>

      {submitError && <p className="mt-4 text-sm text-red-400">{submitError}</p>}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
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
          {submitting ? "Listing…" : "List my flat"}
        </button>
      </div>
    </Modal>
  );
}
