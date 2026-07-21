export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function fetchJson(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
