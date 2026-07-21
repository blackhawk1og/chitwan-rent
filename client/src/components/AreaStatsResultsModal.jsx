import { Ruler, Loader2 } from "lucide-react";
import Modal from "./Modal.jsx";
import Pill from "./ui/Pill.jsx";
import { useAreaStats } from "../hooks/useAreaStats.js";
import { formatRs } from "../lib/format.js";

const TYPE_TABS = [
  { value: "all", label: "All" },
  { value: "gated", label: "Gated" },
  { value: "not_gated", label: "Not Gated" },
];

function bucketLabel(bhk) {
  return bhk === "5+" ? "5+ BHK" : `${bhk} BHK`;
}

export default function AreaStatsResultsModal({ bounds, type, onTypeChange, onClose }) {
  const { data, isLoading } = useAreaStats(bounds, type);

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-purple/20 text-accent-purple-light">
          <Ruler size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Stats for Area</h2>
          <p className="mt-1 text-sm text-text-muted">
            {isLoading ? "Crunching numbers…" : `${data?.count ?? 0} pins found in selection`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {TYPE_TABS.map((tab) => (
          <Pill key={tab.value} active={type === tab.value} onClick={() => onTypeChange(tab.value)}>
            {tab.label}
          </Pill>
        ))}
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl bg-accent-purple/15 border border-accent-purple/30 px-4 py-3">
              <span className="text-sm font-bold text-text-primary">
                Overall avg · {data.count} flat{data.count === 1 ? "" : "s"}
              </span>
              <span className="text-lg font-extrabold text-accent-purple-light">
                {data.overallAvg ? formatRs(data.overallAvg) : "—"}
              </span>
            </div>

            <div className="mt-3 divide-y divide-white/5">
              {data.buckets.map((b) => (
                <div key={b.bhk} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-bold text-text-primary">{bucketLabel(b.bhk)}</div>
                    <div className="text-xs text-text-muted">
                      {b.count} flat{b.count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-text-primary">
                      {b.avg ? formatRs(b.avg) : "—"}
                    </div>
                    {b.min !== null && (
                      <div className="text-xs text-text-muted">
                        {formatRs(b.min)} – {formatRs(b.max)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
