import { useState } from "react";
import { Sofa, Box, ShieldCheck, ShieldOff, Mail, Bus, ChevronDown } from "lucide-react";
import Modal from "./Modal.jsx";
import Switch from "./Switch.jsx";
import { useAreas } from "../hooks/useAreas.js";
import { DEFAULT_FILTERS } from "../lib/filters.js";

const BHK_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5+" },
];

const POSTED_WITHIN_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "all", label: "All" },
];

function SectionLabel({ children }) {
  return <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-text-muted">{children}</div>;
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-accent-purple bg-accent-purple text-white"
          : "border-white/10 bg-surface-alt text-text-primary hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-accent-purple bg-accent-purple text-white"
          : "border-white/10 bg-surface-alt text-text-primary hover:bg-white/5"
      }`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

export default function FilterModal({ initialFilters, onApply, onClose }) {
  const [draft, setDraft] = useState(initialFilters);
  const { data: areas = [] } = useAreas();

  const toggleBhk = (value) => {
    setDraft((d) => ({
      ...d,
      bhk: d.bhk.includes(value) ? d.bhk.filter((v) => v !== value) : [...d.bhk, value],
    }));
  };

  const handleClearAll = () => setDraft(DEFAULT_FILTERS);
  const handleDone = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-3xl">
      <div className="flex items-start justify-between pr-8">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Filters</h2>
          <p className="mt-1 text-sm text-text-muted">Customize the way you see chitwan.rent</p>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-sm font-semibold text-accent-purple-light hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <div>
            <SectionLabel>Sponsored</SectionLabel>
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs text-text-muted">
              No sponsored listings yet
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Available flats for rent</span>
            <Switch
              checked={draft.availableOnly}
              onChange={(v) => setDraft((d) => ({ ...d, availableOnly: v }))}
              label="Available flats for rent"
            />
          </div>

          <div>
            <SectionLabel>Bedrooms (BHK)</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {BHK_OPTIONS.map((opt) => (
                <Pill key={opt.value} active={draft.bhk.includes(opt.value)} onClick={() => toggleBhk(opt.value)}>
                  {opt.label}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Rent range (Rs./month)</SectionLabel>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={draft.rentMin}
                onChange={(e) => setDraft((d) => ({ ...d, rentMin: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <span className="text-sm text-text-muted">to</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={draft.rentMax}
                onChange={(e) => setDraft((d) => ({ ...d, rentMax: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>

          <div>
            <SectionLabel>Neighbourhood</SectionLabel>
            <div className="relative">
              <select
                value={draft.area}
                onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                className="w-full appearance-none rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-text-primary focus:outline-none"
              >
                <option value="all">All Chitwan</option>
                {areas.map((a) => (
                  <option key={a.area} value={a.area}>
                    {a.area}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          <div>
            <SectionLabel>Furnishing</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton
                icon={Sofa}
                active={draft.furnishing === "furnished"}
                onClick={() =>
                  setDraft((d) => ({ ...d, furnishing: d.furnishing === "furnished" ? null : "furnished" }))
                }
              >
                Furnished
              </ToggleButton>
              <ToggleButton
                icon={Box}
                active={draft.furnishing === "unfurnished"}
                onClick={() =>
                  setDraft((d) => ({ ...d, furnishing: d.furnishing === "unfurnished" ? null : "unfurnished" }))
                }
              >
                Unfurnished
              </ToggleButton>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div>
            <SectionLabel>Society type</SectionLabel>
            <div className="flex gap-2">
              <ToggleButton
                icon={ShieldCheck}
                active={draft.gated === "gated"}
                onClick={() => setDraft((d) => ({ ...d, gated: d.gated === "gated" ? null : "gated" }))}
              >
                Gated
              </ToggleButton>
              <ToggleButton
                icon={ShieldOff}
                active={draft.gated === "not_gated"}
                onClick={() => setDraft((d) => ({ ...d, gated: d.gated === "not_gated" ? null : "not_gated" }))}
              >
                Not Gated
              </ToggleButton>
            </div>
          </div>

          <div>
            <SectionLabel>Posted within</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {POSTED_WITHIN_OPTIONS.map((opt) => (
                <Pill
                  key={opt.value}
                  active={draft.postedWithin === opt.value}
                  onClick={() => setDraft((d) => ({ ...d, postedWithin: opt.value }))}
                >
                  {opt.label}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>To-let boards spotted by users</SectionLabel>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-alt px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Mail size={15} />
                Show To-Let boards
              </div>
              <Switch
                checked={draft.showToletBoards}
                onChange={(v) => setDraft((d) => ({ ...d, showToletBoards: v }))}
                label="Show To-Let boards"
              />
            </div>
          </div>

          <div>
            <SectionLabel>Near bus route</SectionLabel>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-alt px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Bus size={15} />
                Near Bus Route
              </div>
              <Switch
                checked={draft.nearBusRoute}
                onChange={(v) => setDraft((d) => ({ ...d, nearBusRoute: v }))}
                label="Near Bus Route"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDone}
        className="mt-8 w-full rounded-full bg-accent-purple py-3.5 text-sm font-bold text-white transition hover:bg-accent-purple-light"
      >
        Done
      </button>
    </Modal>
  );
}
