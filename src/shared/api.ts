// fetch wrapper for the panel. Reads the bearer token from chrome.storage.local
// via the helpers in storage.ts.

import { API_BASE_URL } from "./config";
import { loadToken } from "./storage";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown = null,
  ) {
    super(message);
  }
}

async function authHeader(): Promise<HeadersInit> {
  const stored = await loadToken();
  return stored ? { Authorization: `Bearer ${stored.token}` } : {};
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  for (const [k, v] of Object.entries(await authHeader())) headers.set(k, v as string);

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    throw new ApiError(res.status, text || res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiFetchBlob(
  path: string,
): Promise<{ blob: Blob; filename: string | null }> {
  const headers: HeadersInit = await authHeader();
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename="([^"]+)"/);
  return { blob, filename: m ? (m[1] ?? null) : null };
}
