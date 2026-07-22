const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const TRACK_PADDING = 2;
const KNOB_SIZE = TRACK_HEIGHT - TRACK_PADDING * 2;
const ON_TRANSLATE_X = TRACK_WIDTH - KNOB_SIZE - TRACK_PADDING * 2;

export default function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
      className={`relative shrink-0 rounded-full transition-colors duration-150 ease-in-out ${
        checked ? "bg-accent-purple" : "bg-white/20"
      }`}
    >
      <span
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          left: TRACK_PADDING,
          top: "50%",
          transform: `translateY(-50%) translateX(${checked ? ON_TRANSLATE_X : 0}px)`,
        }}
        className="absolute rounded-full bg-white shadow-md transition-transform duration-150 ease-in-out"
      />
    </button>
  );
}
