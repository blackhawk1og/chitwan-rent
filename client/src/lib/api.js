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
    throw new Error(errBody.error || `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
