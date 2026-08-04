import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Lock, ArrowLeft, LogOut, Search, Trash2, AlertTriangle } from "lucide-react";
import { dashboardApi } from "../lib/dashboardApi.js";
import { formatRs, formatRelativeTime, bhkLabel } from "../lib/format.js";
import TextField from "../components/ui/TextField.jsx";
import Pill from "../components/ui/Pill.jsx";
import Modal from "../components/Modal.jsx";

// Internal-only tool (see Step 0 notes in this feature's PR): route is
// /internal/dashboard specifically because it's not obviously guessable and
// isn't linked from any nav, sitemap, or public page — same reasoning as the
// server route it talks to (routes/dashboard.js). The real protection is
// still the shared DASHBOARD_PASSWORD + session cookie, not the route name.
export default function InternalDashboardPage() {
  const sessionQuery = useQuery({ queryKey: ["dashboard-session"], queryFn: dashboardApi.getSession });

  if (sessionQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-text-muted">Loading…</div>
    );
  }

  if (!sessionQuery.data?.authenticated) {
    return <LoginGate onSuccess={() => sessionQuery.refetch()} />;
  }

  return <Dashboard onLoggedOut={() => sessionQuery.refetch()} />;
}

function LoginGate({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await dashboardApi.login(password);
      onSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition hover:text-text-primary">
          <ArrowLeft size={14} />
          Back to map
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple-light">
            <Lock size={18} />
          </div>
          <h1 className="text-lg font-bold text-text-primary">Internal Dashboard</h1>
        </div>
        <p className="mt-4 text-sm text-text-muted">Enter the shared password to continue.</p>

        <div className="mt-5">
          <TextField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!password || submitting}
          className="mt-5 w-full rounded-full bg-accent-purple py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ onLoggedOut }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await dashboardApi.logout();
    } finally {
      setLoggingOut(false);
      onLoggedOut();
    }
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition hover:text-text-primary">
              <ArrowLeft size={14} />
              Back to map
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-text-primary">Internal Dashboard</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-alt px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/5 disabled:opacity-50"
          >
            <LogOut size={14} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <RecentListingsSection />
          <ReportsSection />
          <InterestsSection />
          <DigestHealthSection />
          <RateLimitLookupSection />
          <DataHygieneSection />
          <DeleteUserSection />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-surface p-5 sm:p-6">
      <h2 className="text-base font-bold text-text-primary sm:text-lg">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// max-h-[420px] + overflow-y-auto: GET /listings alone can return up to 200
// rows (see routes/dashboard.js's LIMIT 200) — rendered inline with no cap,
// that turned the whole dashboard page into an ~9000px scroll (caught while
// smoke-testing this feature, see this feature's own deliverables notes).
// sticky thead keeps the column headers visible while scrolling within that
// box instead of just at the top of a now-enormous page.
function Table({ columns, rows, emptyLabel = "Nothing to show." }) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-text-muted">
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-3 py-2 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-white/5 text-text-primary/90">
              {columns.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-3 py-2.5">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeedBadge({ isSeed }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        isSeed ? "bg-white/10 text-text-muted" : "bg-accent-teal/20 text-accent-teal"
      }`}
    >
      {isSeed ? "seed" : "real"}
    </span>
  );
}

// --- 1. Recent listings --------------------------------------------------
const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "available", label: "Available" },
  { value: "pending_verification", label: "Pending verification" },
  { value: "rented", label: "Rented" },
];

// Per-row operator override — distinct from, and doesn't touch, the
// owner-facing /flatstatus 10-digit-code flow (FlatStatusPage.jsx). Requires
// an explicit second click on "Confirm" (not a single accidental tap) before
// the DELETE actually fires; "Cancel" backs out with no request made.
function DeleteFlatButton({ flatId, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await dashboardApi.deleteListing(flatId);
      onDeleted();
    } catch (err) {
      setError(err.message || "Failed to delete flat");
      setDeleting(false);
    }
  };

  // Backdrop/X click reuses the same Cancel behavior — closes with no
  // request sent — but is ignored mid-delete so a stray click can't dismiss
  // the modal while the request is still in flight.
  const handleClose = () => {
    if (!deleting) setConfirming(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete flat ${flatId}`}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 size={13} />
        Delete
      </button>

      {confirming && (
        <Modal onClose={handleClose} maxWidthClass="max-w-sm">
          <h2 className="pr-8 text-lg font-bold text-text-primary">Delete flat {flatId}?</h2>
          <p className="mt-2 text-sm text-text-muted">This cannot be undone.</p>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleting}
              className="flex-1 rounded-full border border-white/10 bg-surface-alt py-2.5 text-sm font-bold text-text-primary transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Confirm"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function RecentListingsSection() {
  const [status, setStatus] = useState("");
  const listingsQuery = useQuery({
    queryKey: ["dashboard-listings", status],
    queryFn: () => dashboardApi.getListings(status || undefined),
  });

  return (
    <SectionCard title="Recent listings" subtitle="Ordered by posted_at, most recent first. Includes pending/reported rows hidden from the public map.">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Pill key={f.value} active={status === f.value} onClick={() => setStatus(f.value)}>
            {f.label}
          </Pill>
        ))}
      </div>
      <div className="mt-4">
        {listingsQuery.isLoading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : listingsQuery.isError ? (
          <p className="text-sm text-red-400">{listingsQuery.error.message}</p>
        ) : (
          <Table
            columns={[
              { key: "id", label: "ID" },
              { key: "status", label: "Status" },
              { key: "bhk", label: "BHK", render: (r) => bhkLabel(r.bhk) },
              { key: "rent", label: "Rent", render: (r) => formatRs(r.rent) },
              { key: "posted_at", label: "Posted", render: (r) => `${formatRelativeTime(r.posted_at)} ago` },
              { key: "is_seed", label: "Source", render: (r) => <SeedBadge isSeed={r.is_seed} /> },
              { key: "owner_id", label: "Owner ID", render: (r) => r.owner_id ?? "—" },
              // Feeds straight into the delete-user search above/below it —
              // deliberately email, not phone (out of scope for this table).
              { key: "owner_email", label: "Owner email", render: (r) => r.owner_email ?? "—" },
              {
                key: "actions",
                label: "Actions",
                render: (r) => <DeleteFlatButton flatId={r.id} onDeleted={() => listingsQuery.refetch()} />,
              },
            ]}
            rows={listingsQuery.data ?? []}
          />
        )}
      </div>
    </SectionCard>
  );
}

// --- 2. Reports ------------------------------------------------------------
// removalEmailSent is either an ISO timestamp (flats.report_removal_email_
// sent_at, when the send is confirmed) or one of three fixed labels from
// routes/dashboard.js ("n/a — below threshold", "not sent", "unknown
// (removed before this was tracked)") — this tells the two apart so a real
// timestamp renders as relative time instead of a raw ISO string.
function isIsoTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function ReportsSection() {
  const reportsQuery = useQuery({ queryKey: ["dashboard-reports"], queryFn: dashboardApi.getReports });

  return (
    <SectionCard title="Reports" subtitle="Flats with report_count > 0, most-reported first.">
      {reportsQuery.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : reportsQuery.isError ? (
        <p className="text-sm text-red-400">{reportsQuery.error.message}</p>
      ) : (
        <>
          <Table
            columns={[
              { key: "id", label: "ID" },
              { key: "report_count", label: "Reports" },
              {
                key: "hitRemovalThreshold",
                label: "Auto-removed",
                render: (r) => (r.hitRemovalThreshold ? <span className="text-red-400">Yes (≥3)</span> : "No"),
              },
              {
                key: "removalEmailSent",
                label: "Removal email",
                render: (r) =>
                  isIsoTimestamp(r.removalEmailSent) ? (
                    <span className="text-accent-teal">Sent {formatRelativeTime(r.removalEmailSent)} ago</span>
                  ) : r.removalEmailSent === "not sent" ? (
                    <span className="text-red-400">Not sent</span>
                  ) : (
                    r.removalEmailSent
                  ),
              },
              { key: "status", label: "Status" },
              { key: "bhk", label: "BHK", render: (r) => bhkLabel(r.bhk) },
              { key: "rent", label: "Rent", render: (r) => formatRs(r.rent) },
            ]}
            rows={reportsQuery.data ?? []}
            emptyLabel="No reported listings right now."
          />
          <p className="mt-3 flex items-start gap-1.5 text-xs text-text-muted">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-accent-orange" />
            Remaining gap: flats that crossed the threshold before flats.report_removal_email_sent_at existed have
            no way to know their true outcome — shown as "unknown (removed before this was tracked)", not guessed.
          </p>
        </>
      )}
    </SectionCard>
  );
}

// --- Interests --------------------------------------------------------
// The only place any of this is visible outside a raw SQL query — see this
// feature's own investigation task, which found flat_interests was a
// complete dead end before this section existed (data saved, nobody ever
// saw it). Shows actual submission content, not just a count.
const INTEREST_MOVE_IN_LABELS = { asap: "ASAP", next_month: "Next month", flexible: "Flexible" };
const INTEREST_GENDER_LABELS = { male: "Male", female: "Female", other: "Other" };

function InterestsSection() {
  const interestsQuery = useQuery({ queryKey: ["dashboard-interests"], queryFn: dashboardApi.getInterests });

  return (
    <SectionCard title="Interests" subtitle={'"I\'m interested" submissions from the flat detail panel, most recent first.'}>
      {interestsQuery.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : interestsQuery.isError ? (
        <p className="text-sm text-red-400">{interestsQuery.error.message}</p>
      ) : (
        <Table
          columns={[
            { key: "flat_id", label: "Flat ID" },
            { key: "contact", label: "Contact" },
            { key: "move_in", label: "Move-in", render: (r) => (r.move_in ? INTEREST_MOVE_IN_LABELS[r.move_in] ?? r.move_in : "—") },
            { key: "gender", label: "They are", render: (r) => (r.gender ? INTEREST_GENDER_LABELS[r.gender] ?? r.gender : "—") },
            {
              key: "parking_required",
              label: "Parking",
              render: (r) =>
                r.parking_required === true
                  ? `Required${Number.isFinite(r.parking_count) ? ` (${r.parking_count})` : ""}`
                  : "—",
            },
            { key: "note", label: "Note", render: (r) => r.note || "—" },
            { key: "created_at", label: "Submitted", render: (r) => `${formatRelativeTime(r.created_at)} ago` },
          ]}
          rows={interestsQuery.data ?? []}
          emptyLabel="No interest submissions yet."
        />
      )}
    </SectionCard>
  );
}

// --- 3. Digest job health ---------------------------------------------
function DigestHealthSection() {
  const healthQuery = useQuery({ queryKey: ["dashboard-digest-health"], queryFn: dashboardApi.getDigestHealth });

  return (
    <SectionCard title="Digest job health" subtitle="Due = next_digest_at <= now(), within the same active-pool filter the digest job itself uses.">
      {healthQuery.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : healthQuery.isError ? (
        <p className="text-sm text-red-400">{healthQuery.error.message}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-surface-alt/40 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Flats</div>
            <div className="mt-1 text-2xl font-bold text-text-primary">{healthQuery.data.flats.due}</div>
            <div className="text-xs text-text-muted">due &middot; {healthQuery.data.flats.not_due} not due</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-alt/40 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Seeker pins</div>
            <div className="mt-1 text-2xl font-bold text-text-primary">{healthQuery.data.seekers.due}</div>
            <div className="text-xs text-text-muted">due &middot; {healthQuery.data.seekers.not_due} not due</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-alt/40 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Last run</div>
            {healthQuery.data.lastRun ? (
              <>
                <div className="mt-1 text-sm font-bold text-text-primary">
                  {formatRelativeTime(healthQuery.data.lastRun.run_at)} ago
                </div>
                <div className="mt-1 text-[11px] leading-snug text-text-muted">
                  {healthQuery.data.lastRun.summary?.flatDigestsSent ?? 0} flat / {healthQuery.data.lastRun.summary?.seekerDigestsSent ?? 0} seeker
                  digest(s) sent
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-text-muted">Never run yet</div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// --- 4. Rate-limit lookup --------------------------------------------
// formatRelativeTime (lib/format.js) is "X ago" — built for past timestamps
// only, so it can't be reused for windowClearsAt, which is always in the
// future while it's non-null (see routes/dashboard.js's rate-limit-lookup).
function hoursUntil(dateInput) {
  return Math.max(1, Math.ceil((new Date(dateInput).getTime() - Date.now()) / (60 * 60 * 1000)));
}

function RateLimitLookupSection() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setResult(await dashboardApi.getRateLimitLookup(q.trim()));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <SectionCard title="Rate-limit lookup" subtitle="Search listing_attempts by email or phone (phone is resolved via the users table — see gap note below).">
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <TextField label="Email or phone" placeholder="e.g. someone@example.com" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={!q.trim() || searching}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-purple px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search size={14} />
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-4">
          <p className="text-xs text-text-muted">
            Searched: {result.searchedEmails.join(", ")}
            {result.windowClearsAt ? (
              <> &middot; 24h window clears in ~{hoursUntil(result.windowClearsAt)}h</>
            ) : (
              " · no active 24h window right now"
            )}
          </p>
          <div className="mt-3">
            <Table
              columns={[
                { key: "email", label: "Email" },
                { key: "created_at", label: "Attempted", render: (r) => `${formatRelativeTime(r.created_at)} ago` },
              ]}
              rows={result.attempts}
              emptyLabel="No listing attempts found for this email/phone."
            />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// --- 5. Data hygiene counts -----------------------------------------
function seedCount(rows, isSeed) {
  return rows?.find((r) => r.is_seed === isSeed)?.count ?? 0;
}

function DataHygieneSection() {
  const hygieneQuery = useQuery({ queryKey: ["dashboard-hygiene"], queryFn: dashboardApi.getHygiene });

  return (
    <SectionCard title="Data hygiene counts" subtitle="is_seed=true vs false, per table.">
      {hygieneQuery.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : hygieneQuery.isError ? (
        <p className="text-sm text-red-400">{hygieneQuery.error.message}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Flats", rows: hygieneQuery.data.flats },
              { label: "Seeker pins", rows: hygieneQuery.data.seekerPins },
              { label: "Users", rows: hygieneQuery.data.users },
            ].map(({ label, rows }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-surface-alt/40 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">{label}</div>
                <div className="mt-1 text-sm text-text-primary">
                  <span className="font-bold text-accent-teal">{seedCount(rows, false)}</span> real &middot;{" "}
                  <span className="font-bold text-text-muted">{seedCount(rows, true)}</span> seed
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-text-muted">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-accent-orange" />
            rent_reports: {hygieneQuery.data.rentReports.gap}
          </p>
        </>
      )}
    </SectionCard>
  );
}

// --- 6. Single explicit user delete --------------------------------
function DeleteUserSection() {
  const [q, setQ] = useState("");
  const [lookup, setLookup] = useState(null);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    setLookup(null);
    setDeleteResult(null);
    setConfirmText("");
    try {
      setLookup(await dashboardApi.lookupUser(q.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async () => {
    if (!lookup || confirmText.trim() !== String(lookup.user.id) || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await dashboardApi.deleteUser(lookup.user.id, confirmText.trim());
      setDeleteResult(result);
      setLookup(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const counts = lookup?.cascadeCounts;
  const totalCascaded = counts
    ? Object.values(counts).reduce((sum, n) => sum + Number(n), 0)
    : 0;

  return (
    <SectionCard
      title="Delete a user"
      subtitle="The only destructive action in this dashboard — no bulk deletes, no listing edits. Requires typing the user's id to confirm."
    >
      <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <TextField label="User id or email" placeholder="e.g. 42" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={!q.trim() || searching}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-purple px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search size={14} />
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {deleteResult && (
        <div className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
          User {deleteResult.userId} deleted, along with {deleteResult.flatsDeleted} owned flat(s) and everything
          cascaded from them.
        </div>
      )}

      {lookup && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-surface-alt/40 p-4">
          <div className="text-sm font-bold text-text-primary">
            #{lookup.user.id} — {lookup.user.name || "(no name)"}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {lookup.user.email || "no email"} &middot; {lookup.user.phone || "no phone"} &middot;{" "}
            {lookup.user.is_seed ? "seed user" : "real user"}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted sm:grid-cols-4">
            <div>Flats: <span className="font-bold text-text-primary">{counts.flats}</span></div>
            <div>Seeker pins: <span className="font-bold text-text-primary">{counts.seeker_pins}</span></div>
            <div>To-let spots: <span className="font-bold text-text-primary">{counts.tolet_spots}</span></div>
            <div>Ratings: <span className="font-bold text-text-primary">{counts.flat_ratings}</span></div>
            <div>Comments: <span className="font-bold text-text-primary">{counts.flat_comments}</span></div>
            <div>Reports filed: <span className="font-bold text-text-primary">{counts.flat_reports}</span></div>
            <div>Interests: <span className="font-bold text-text-primary">{counts.flat_interests}</span></div>
          </div>

          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="flex items-start gap-1.5 text-xs font-semibold text-red-400">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              This permanently deletes this user and {totalCascaded} related row(s) (their listings and everything
              cascaded from those listings, plus every row above). Cannot be undone.
            </p>
            <div className="mt-3">
              <TextField
                label={`Type ${lookup.user.id} to confirm`}
                placeholder={String(lookup.user.id)}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText.trim() !== String(lookup.user.id) || deleting}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={14} />
              {deleting ? "Deleting…" : "Permanently delete this user"}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
