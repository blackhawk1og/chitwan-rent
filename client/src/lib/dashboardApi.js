// Separate from lib/api.js on purpose: every other route in this app
// authenticates with a per-user Bearer token from localStorage (see
// authStorage.js), but the internal dashboard uses one shared-password
// session cookie instead (server's src/lib/dashboardAuth.js) — so this
// needs `credentials: "include"` on every request instead of an
// Authorization header, and has no per-user session to read.
import { API_URL } from "./api.js";

const DASHBOARD_BASE = `${API_URL}/internal/dashboard`;

async function request(path, options = {}) {
  const res = await fetch(`${DASHBOARD_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export const dashboardApi = {
  getSession: () => request("/session"),
  login: (password) => request("/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request("/logout", { method: "POST" }),

  getListings: (status) => request(`/listings${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  // Operator override, no code — distinct from the owner-facing
  // postJson(`/flats/${id}/delete`, { code }) flow in lib/api.js used by
  // FlatStatusPage.jsx, which this doesn't touch.
  deleteListing: (id) => request(`/listings/${id}`, { method: "DELETE" }),
  getReports: () => request("/reports"),
  getDigestHealth: () => request("/digest-health"),
  getRateLimitLookup: (q) => request(`/rate-limit-lookup?q=${encodeURIComponent(q)}`),
  getHygiene: () => request("/hygiene"),
  getInterests: () => request("/interests"),
  getToletSpots: () => request("/tolet-spots"),

  lookupUser: (q) => request(`/users/lookup?q=${encodeURIComponent(q)}`),
  deleteUser: (id, confirmId) =>
    request(`/users/${id}/delete`, { method: "POST", body: JSON.stringify({ confirmId }) }),
};
