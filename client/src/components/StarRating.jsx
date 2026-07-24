import { useState } from "react";
import { Star } from "lucide-react";

export function StarRatingDisplay({ value, size = 16 }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rounded ? "fill-amber-400 text-amber-400" : "text-white/15"}
        />
      ))}
    </div>
  );
}

export function StarRatingInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
          className="p-1"
        >
          <Star
            size={32}
            className={n <= active ? "fill-amber-400 text-amber-400" : "text-white/15"}
          />
        </button>
      ))}
    </div>
  );
}
