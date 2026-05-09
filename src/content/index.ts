// Content script. Runs on every page (matches: <all_urls>) but does nothing
// until messaged. Two responsibilities:
//
//   1. EXTRACT_PAGE — return the visible text of the current page so the panel
//      can ship it to /api/discover/extract-listing/.
//   2. Listen for the SCOUT_EXTENSION_TOKEN postMessage emitted by the
//      scout-frontend /extension-link page and forward it to background.

import { EXTENSION_LINK_PATH, WEB_APP_BASE_URL } from "@/shared/config";
import type { ExtractPageRequest, ExtractPageResponse } from "@/shared/messages";

const MAX_TEXT_CHARS = 30_000;

// 1. Page-text extractor ---------------------------------------------------

chrome.runtime.onMessage.addListener(
  (msg: ExtractPageRequest, _sender, sendResponse): boolean => {
    if (msg?.kind !== "EXTRACT_PAGE") return false;
    const text = (document.body?.innerText || "").slice(0, MAX_TEXT_CHARS);
    const r: ExtractPageResponse = {
      ok: true,
      url: location.href,
      title: document.title,
      text,
    };
    sendResponse(r);
    return true;
  },
);

// 2. Token-link bridge -----------------------------------------------------
//
// Binds unconditionally and gates inside the handler. This is robust against
// SPA-style navigation: if the script loads on /sign-in and Clerk redirects
// client-side to /extension-link, an origin/pathname check at script-load
// time would have skipped binding the listener altogether.

interface ScoutExtensionTokenMessage {
  type: "SCOUT_EXTENSION_TOKEN";
  token: string;
  expiresAt: string;
}

function isExtensionLinkPage(): boolean {
  try {
    const u = new URL(location.href);
    const expected = new URL(WEB_APP_BASE_URL);
    return u.origin === expected.origin && u.pathname === EXTENSION_LINK_PATH;
  } catch {
    return false;
  }
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  if (event.origin !== location.origin) return;
  const data = event.data as ScoutExtensionTokenMessage | null;
  if (!data || data.type !== "SCOUT_EXTENSION_TOKEN") return;
  if (typeof data.token !== "string" || typeof data.expiresAt !== "string") return;
  // Origin-gate so a random page can't ship us a forged token.
  if (!isExtensionLinkPage()) return;

  console.debug("[scout-content] forwarding LINK_TOKEN");
  chrome.runtime
    .sendMessage({ kind: "LINK_TOKEN", token: data.token, expiresAt: data.expiresAt })
    .then((res) => console.debug("[scout-content] LINK_TOKEN reply:", res))
    .catch((err) => console.warn("[scout-content] LINK_TOKEN failed:", err));
});
