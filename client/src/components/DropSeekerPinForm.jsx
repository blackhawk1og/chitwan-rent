import { useState } from "react";
import { Calendar, Utensils, Cigarette, Car, User, Users, UserRound } from "lucide-react";
import Modal from "./Modal.jsx";
import Pill from "./ui/Pill.jsx";
import ToggleButton from "./ui/ToggleButton.jsx";
import SectionLabel from "./ui/SectionLabel.jsx";
import TextField from "./ui/TextField.jsx";
import { useNearbyStats } from "../hooks/useNearbyStats.js";
import { formatRs } from "../lib/format.js";
import { isValidEmail, isValidPhone, sanitizePhoneInput } from "../lib/validation.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

const BHK_PREF_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "any", label: "Any" },
];

const initialForm = {
  lookingFor: null, // 'whole_flat' | 'room'
  budget: "",
  bhkPref: null,
  moveIn: null, // 'asap' | 'next_month' | 'flexible'
  foodPref: null, // 'veg' | 'non_veg' | 'any'
  smokerOk: null, // 'smoker' | 'non_smoker'
  gender: null, // 'male' | 'female' | 'other'
  flatmateGenderPref: null, // 'male' | 'female' | 'any'
  parkingRequired: false,
  lifestyleNote: "",
  email: "",
  phone: "",
};

function NearbyRentLine({ lat, lng }) {
  const { data, isLoading } = useNearbyStats(lat, lng, 2000);

  if (isLoading) {
    return <p className="text-xs text-text-muted">Median rent in 2km radius: crunching numbers…</p>;
  }
  if (!data) return null;

  return (
    <p className="text-xs text-text-muted">
      Median rent in 2km radius:{" "}
      {data.buckets.map((b, i) => (
        <span key={b.bhk}>
          {i > 0 && " · "}
          {b.bhk}BHK {b.median ? formatRs(b.median) : "—"} ({b.count} pin{b.count === 1 ? "" : "s"})
        </span>
      ))}
    </p>
  );
}

export default function DropSeekerPinForm({ lat, lng, onCancel, onSubmit, submitting, submitError }) {
  const [form, setForm] = useState(initialForm);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const debouncedEmail = useDebouncedValue(form.email);
  const debouncedPhone = useDebouncedValue(form.phone);
  const emailError = debouncedEmail !== "" && !isValidEmail(debouncedEmail) ? "Enter a valid email address" : null;
  const phoneError = debouncedPhone !== "" && !isValidPhone(debouncedPhone) ? "Enter a valid 10-digit mobile number" : null;
  const isValid =
    form.lookingFor !== null &&
    form.budget !== "" &&
    isValidEmail(form.email) &&
    isValidPhone(form.phone);

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    onSubmit(form);
  };

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Drop a Seeker Pin</h2>
        <p className="mt-1 text-sm text-text-muted">Tell us what you're after — takes less than a minute.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        {/* Card 1 */}
        <div className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-surface-alt/40 p-5">
          <blockquote className="rounded-xl border border-white/10 bg-surface-alt px-4 py-3 text-sm italic text-text-primary/90">
            "Dropped a pin near Pulchowk on a Tuesday, moved in by the weekend — no broker fees."
            <footer className="mt-1.5 text-xs not-italic text-text-muted">— Rekha K., Bharatpur-5</footer>
          </blockquote>

          <div>
            <SectionLabel>I'm looking for *</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton accent="teal" active={form.lookingFor === "whole_flat"} onClick={() => set({ lookingFor: "whole_flat" })}>
                Whole Flat
              </ToggleButton>
              <ToggleButton accent="teal" active={form.lookingFor === "room"} onClick={() => set({ lookingFor: "room" })}>
                Room in a Flat
              </ToggleButton>
            </div>
          </div>

          <div>
            <TextField
              label="Budget per room (Rs./month) *"
              prefix="Rs."
              type="number"
              min="0"
              placeholder="e.g. 8000"
              value={form.budget}
              onChange={(e) => set({ budget: e.target.value })}
            />
            <div className="mt-2">
              <NearbyRentLine lat={lat} lng={lng} />
            </div>
          </div>

          <div>
            <SectionLabel>BHK Preference</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {BHK_PREF_OPTIONS.map((opt) => (
                <Pill key={opt.value} accent="teal" active={form.bhkPref === opt.value} onClick={() => set({ bhkPref: form.bhkPref === opt.value ? null : opt.value })}>
                  {opt.label}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Move-in Timeline</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <ToggleButton accent="teal" icon={Calendar} active={form.moveIn === "asap"} onClick={() => set({ moveIn: form.moveIn === "asap" ? null : "asap" })}>
                ASAP
              </ToggleButton>
              <ToggleButton accent="teal" icon={Calendar} active={form.moveIn === "next_month"} onClick={() => set({ moveIn: form.moveIn === "next_month" ? null : "next_month" })}>
                Next month
              </ToggleButton>
              <ToggleButton accent="teal" icon={Calendar} active={form.moveIn === "flexible"} onClick={() => set({ moveIn: form.moveIn === "flexible" ? null : "flexible" })}>
                Flexible
              </ToggleButton>
            </div>
          </div>

          <div>
            <SectionLabel>Food preference in flatmate</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <ToggleButton accent="teal" icon={Utensils} active={form.foodPref === "veg"} onClick={() => set({ foodPref: form.foodPref === "veg" ? null : "veg" })}>
                Veg
              </ToggleButton>
              <ToggleButton accent="teal" icon={Utensils} active={form.foodPref === "non_veg"} onClick={() => set({ foodPref: form.foodPref === "non_veg" ? null : "non_veg" })}>
                Non-veg
              </ToggleButton>
              <ToggleButton accent="teal" icon={Utensils} active={form.foodPref === "any"} onClick={() => set({ foodPref: form.foodPref === "any" ? null : "any" })}>
                Any
              </ToggleButton>
            </div>
          </div>

          <div>
            <SectionLabel>Okay with a flatmate who smokes?</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton accent="teal" icon={Cigarette} active={form.smokerOk === "smoker"} onClick={() => set({ smokerOk: form.smokerOk === "smoker" ? null : "smoker" })}>
                Smoker OK
              </ToggleButton>
              <ToggleButton accent="teal" icon={Cigarette} active={form.smokerOk === "non_smoker"} onClick={() => set({ smokerOk: form.smokerOk === "non_smoker" ? null : "non_smoker" })}>
                Non-smoker only
              </ToggleButton>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-surface-alt/40 p-5">
          <div>
            <SectionLabel>You are (optional but helps matching)</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <ToggleButton accent="teal" icon={User} active={form.gender === "male"} onClick={() => set({ gender: form.gender === "male" ? null : "male" })}>
                Male
              </ToggleButton>
              <ToggleButton accent="teal" icon={UserRound} active={form.gender === "female"} onClick={() => set({ gender: form.gender === "female" ? null : "female" })}>
                Female
              </ToggleButton>
              <ToggleButton accent="teal" icon={Users} active={form.gender === "other"} onClick={() => set({ gender: form.gender === "other" ? null : "other" })}>
                Other
              </ToggleButton>
            </div>
          </div>

          <div>
            <SectionLabel>What gender flatmate are you comfortable with?</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <ToggleButton accent="teal" icon={User} active={form.flatmateGenderPref === "male"} onClick={() => set({ flatmateGenderPref: form.flatmateGenderPref === "male" ? null : "male" })}>
                Male
              </ToggleButton>
              <ToggleButton accent="teal" icon={UserRound} active={form.flatmateGenderPref === "female"} onClick={() => set({ flatmateGenderPref: form.flatmateGenderPref === "female" ? null : "female" })}>
                Female
              </ToggleButton>
              <ToggleButton accent="teal" icon={Users} active={form.flatmateGenderPref === "any"} onClick={() => set({ flatmateGenderPref: form.flatmateGenderPref === "any" ? null : "any" })}>
                Any
              </ToggleButton>
            </div>
          </div>

          <div>
            <SectionLabel>Parking required?</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton accent="teal" icon={Car} active={form.parkingRequired === true} onClick={() => set({ parkingRequired: true })}>
                Yes, need parking
              </ToggleButton>
              <ToggleButton accent="teal" active={form.parkingRequired === false} onClick={() => set({ parkingRequired: false })}>
                No preference
              </ToggleButton>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">
              Tell us about your lifestyle (optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Early sleeper, cook most nights, WFH on weekdays, no pets"
              value={form.lifestyleNote}
              onChange={(e) => set({ lifestyleNote: e.target.value })}
              className="w-full resize-none rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>

          <TextField
            label="Your email *"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            error={emailError}
          />

          <TextField
            label="Phone number *"
            type="tel"
            inputMode="numeric"
            placeholder="98XXXXXXXX"
            value={form.phone}
            onChange={(e) => set({ phone: sanitizePhoneInput(e.target.value) })}
            error={phoneError}
            helper="Private — only shared when we find a match for you."
          />

          {form.lookingFor === "room" && (
            <p className="text-xs text-text-muted">
              For room searches, your email and phone are shared by email with compatible room listings within
              2km — only while your pin stays active.
            </p>
          )}
        </div>
      </div>

      {submitError && <p className="mt-4 text-sm text-red-400">{submitError}</p>}

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
          className="flex-1 rounded-full bg-accent-teal py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Dropping pin…" : "Drop Seeker Pin"}
        </button>
      </div>
    </Modal>
  );
}
