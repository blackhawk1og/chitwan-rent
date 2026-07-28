export default function SectionLabel({ children }) {
  const isRequired = typeof children === "string" && children.endsWith(" *");
  const text = isRequired ? children.slice(0, -2) : children;
  return (
    <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-text-muted">
      {text}
      {isRequired && <span className="text-red-400"> *</span>}
    </div>
  );
}
