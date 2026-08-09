import { getStoredSession } from "./authStorage.js";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function fetchJson(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function postJson(path, body) {
  const session = getStoredSession();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(errBody.error || `Request failed: ${res.status} ${res.statusText}`);
    // Lets a caller distinguish e.g. a 429 (specific, actionable message)
    // from other failures without re-parsing the message string — see
    // handleSubmitListFlatDetails in MapShell.jsx for the one caller that
    // currently needs this.
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Multipart upload — separate from postJson rather than a body-type branch
// inside it, since the two need genuinely different headers: postJson always
// sets Content-Type: application/json itself, but a FormData body needs the
// browser to set Content-Type (multipart/form-data with the right boundary)
// automatically, which only happens if this code never sets it explicitly.
// Currently used only by useUploadToletPhoto.js — see routes/toletSpots.js's
// POST /upload-photo.
export async function postFormData(path, formData) {
  const session = getStoredSession();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function patchJson(path, body) {
  const session = getStoredSession();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteJson(path, body) {
  const session = getStoredSession();
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
