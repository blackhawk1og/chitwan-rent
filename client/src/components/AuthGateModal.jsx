import { useState } from "react";
import { UserCircle2 } from "lucide-react";
import Modal from "./Modal.jsx";
import TextField from "./ui/TextField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isValidEmail, isValidPhone, sanitizePhoneInput } from "../lib/validation.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

export default function AuthGateModal({ onSuccess, onCancel }) {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const debouncedEmail = useDebouncedValue(email);
  const debouncedPhone = useDebouncedValue(phone);
  const emailError = debouncedEmail.trim() !== "" && !isValidEmail(debouncedEmail) ? "Enter a valid email address" : null;
  const phoneError = debouncedPhone.trim() !== "" && !isValidPhone(debouncedPhone) ? "Enter a valid 10-digit mobile number" : null;
  const isValid =
    (email.trim() !== "" || phone.trim() !== "") &&
    (email.trim() === "" || isValidEmail(email)) &&
    (phone.trim() === "" || isValidPhone(phone));

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login({ name: name || undefined, email: email || undefined, phone: phone || undefined });
      onSuccess();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onCancel} maxWidthClass="max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-purple/20 text-accent-purple-light">
          <UserCircle2 size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Sign in to continue</h2>
          <p className="mt-1 text-sm text-text-muted">
            Just your email or phone — no password, no OTP.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <TextField
          label="Your name (optional)"
          type="text"
          placeholder="e.g. Sujan Chaudhary"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        <TextField
          label="Phone"
          type="tel"
          inputMode="numeric"
          placeholder="98XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
          error={phoneError}
        />
        <p className="text-xs text-text-muted">At least one of email or phone is required.</p>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="mt-5 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:bg-accent-purple-light disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Signing in…" : "Continue"}
      </button>
    </Modal>
  );
}
