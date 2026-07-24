import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

export default function PhotoCarousel({ photos = [] }) {
  const [index, setIndex] = useState(0);

  if (!photos.length) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-white/10 bg-surface-alt">
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <ImageOff size={28} />
          <span className="text-xs font-medium">No photos yet</span>
        </div>
      </div>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/10 bg-surface-alt">
      <img src={photos[index]} alt="" className="h-full w-full object-cover" />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
            {index + 1}/{photos.length}
          </span>
        </>
      )}
    </div>
  );
}
