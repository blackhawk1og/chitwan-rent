export default function TextField({ label, prefix, suffix, helper, error, ...inputProps }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text-primary">{label}</label>
      <div
        className={`flex items-center gap-1.5 rounded-xl border bg-surface-alt px-3 py-2.5 ${
          error ? "border-red-500/50" : "border-white/10"
        }`}
      >
        {prefix && <span className="text-sm text-text-muted">{prefix}</span>}
        <input
          {...inputProps}
          className="w-full min-w-0 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        {suffix && <span className="shrink-0 text-sm text-text-muted">{suffix}</span>}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      ) : (
        helper && <p className="mt-1.5 text-xs text-text-muted">{helper}</p>
      )}
    </div>
  );
}
