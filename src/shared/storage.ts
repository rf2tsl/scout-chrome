// Token storage helpers. Single source of truth for the chrome.storage key.

export const TOKEN_STORAGE_KEY = "scout.extensionToken";

export interface StoredToken {
  token: string;        // includes the `ext_` prefix; use as-is in Authorization header
  expiresAt: string;    // ISO-8601
  linkedAt: string;     // ISO-8601 — when we received it
}

export async function loadToken(): Promise<StoredToken | null> {
  const out = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
  const v = out[TOKEN_STORAGE_KEY];
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<StoredToken>;
  if (typeof o.token !== "string" || typeof o.expiresAt !== "string") return null;
  return { token: o.token, expiresAt: o.expiresAt, linkedAt: o.linkedAt ?? "" };
}

export async function saveToken(token: string, expiresAt: string): Promise<void> {
  const stored: StoredToken = { token, expiresAt, linkedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: stored });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_STORAGE_KEY);
}
