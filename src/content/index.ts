// Content script. Manifest scopes this to the scout-frontend /extension-link
// page only — its sole job is to forward the freshly-minted token from the
// page's window.postMessage to the background service worker.

interface ScoutExtensionTokenMessage {
  type: "SCOUT_EXTENSION_TOKEN";
  token: string;
  expiresAt: string;
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  if (event.origin !== location.origin) return;
  const data = event.data as ScoutExtensionTokenMessage | null;
  if (!data || data.type !== "SCOUT_EXTENSION_TOKEN") return;
  if (typeof data.token !== "string" || typeof data.expiresAt !== "string") return;

  console.debug("[scout-content] forwarding LINK_TOKEN");
  chrome.runtime
    .sendMessage({ kind: "LINK_TOKEN", token: data.token, expiresAt: data.expiresAt })
    .then((res) => console.debug("[scout-content] LINK_TOKEN reply:", res))
    .catch((err) => console.warn("[scout-content] LINK_TOKEN failed:", err));
});
