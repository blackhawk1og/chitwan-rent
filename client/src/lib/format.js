export function formatRs(amount) {
  if (amount === null || amount === undefined) return "Rs. —";
  return `Rs. ${Number(amount).toLocaleString("en-IN")}`;
}

// Compact "10K" style used where space is tight (e.g. "Your pin: 10K ·
// 1BHK" and the map's own "Your Pin" marker) — formatRs's "Rs. 12,000" is
// too long for those contexts.
export function formatRsCompact(amount) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return "—";
  return n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
}

export function bhkLabel(bhk) {
  if (bhk === null || bhk === undefined) return "—";
  return bhk >= 5 ? "5+ BHK" : `${bhk}BHK`;
}

const RELATIVE_UNITS = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
];

// "9 Aug" style — used by ToletSpotDetailCard's "To-Let spotted · 9 Aug"
// header, where formatRelativeTime's "3 days ago" wording doesn't fit.
// en-GB (not en-US) specifically for its day-before-month order in this
// combo — en-US would print "Aug 9" instead.
export function formatShortDate(dateInput) {
  if (!dateInput) return "";
  return new Date(dateInput).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatRelativeTime(dateInput) {
  if (!dateInput) return "recently";
  const diffMs = Date.now() - new Date(dateInput).getTime();
  if (diffMs < 60 * 1000) return "just now";

  for (const { unit, ms } of RELATIVE_UNITS) {
    const value = Math.floor(diffMs / ms);
    if (value >= 1) return `${value} ${unit}${value === 1 ? "" : "s"}`;
  }
  return "just now";
}
