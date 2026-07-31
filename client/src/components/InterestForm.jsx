import { useState } from "react";
import Modal from "./Modal.jsx";
import TextField from "./ui/TextField.jsx";
import { isValidEmail, isValidPhone, sanitizePhoneInput } from "../lib/validation.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

export default function InterestForm({ onCancel, onSubmit, submitting, submitError }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const debouncedEmail = useDebouncedValue(email);
  const debouncedPhone = useDebouncedValue(phone);
  const emailError = debouncedEmail !== "" && !isValidEmail(debouncedEmail) ? "Enter a valid email address" : null;
  const phoneError = debouncedPhone !== "" && !isValidPhone(debouncedPhone) ? "Enter a valid 10-digit mobile number" : null;
  const isValid = name.trim() !== "" && isValidEmail(email) && isValidPhone(phone);

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    onSubmit({ name: name.trim(), email: email.trim(), phone, note: note.trim() || null });
  };

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-sm">
      <h2 className="text-lg font-bold text-text-primary">I'm interested in this flat</h2>
      <p className="mt-1 text-sm text-text-muted">
        Share your preferences — we'll pass your details to the owner and match you against other nearby flats.
      </p>

      <div className="mt-5 space-y-3">
        <TextField
          label="Your name *"
          placeholder="e.g. Sujan Chaudhary"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
