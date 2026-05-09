// Background service worker. Owns: side-panel toggle, token storage, sign-in
// flow handoff, broadcast of auth changes to the panel.

import { EXTENSION_LINK_PATH, WEB_APP_BASE_URL } from "@/shared/config";
import {
  type AuthChangedEvent,
  type GetActiveTabResponse,
  type GetAuthStateResponse,
  type PanelToBackground,
  type SignOutResponse,
} from "@/shared/messages";
import {
  TOKEN_STORAGE_KEY,
  clearToken,
  loadToken,
  saveToken,
} from "@/shared/storage";
import type { AuthState } from "@/shared/types";

// Side-panel: open on toolbar click ----------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn("[scout-bg] setPanelBehavior failed", err));
});

// Auth state ---------------------------------------------------------------

async function readAuthState(): Promise<AuthState> {
  const stored = await loadToken();
  if (!stored) return { kind: "signed-out" };
  if (new Date(stored.expiresAt) <= new Date()) return { kind: "signed-out" };
  return { kind: "signed-in", token: stored.token, expiresAt: stored.expiresAt };
}

async function broadcastAuth(): Promise<void> {
  const state = await readAuthState();
  const evt: AuthChangedEvent = { kind: "AUTH_CHANGED", state };
  chrome.runtime.sendMessage(evt).catch(() => {
    // No panel open — that's fine, the panel will read via GET_AUTH_STATE on mount.
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (TOKEN_STORAGE_KEY in changes) void broadcastAuth();
});

// Sign-in flow -------------------------------------------------------------
//
// The panel asks the background to start sign-in. The background opens the
// scout web app's /extension-link route in a new tab. That page (Clerk-gated)
// mints a token via POST /api/accounts/extension-token/ and posts it back to
// the same window. Our content script (matched on that URL) listens for the
// message and forwards it here as `LINK_TOKEN`. We persist + close the tab.

interface LinkTokenMessage {
  kind: "LINK_TOKEN";
  token: string;
  expiresAt: string;
}

async function openSignInTab(): Promise<void> {
  const url = `${WEB_APP_BASE_URL}${EXTENSION_LINK_PATH}`;
  await chrome.tabs.create({ url });
}

chrome.runtime.onMessage.addListener(
  (
    message: PanelToBackground | LinkTokenMessage,
    sender,
    sendResponse,
  ): boolean => {
    void (async () => {
      switch (message.kind) {
        case "GET_AUTH_STATE": {
          const state = await readAuthState();
          const r: GetAuthStateResponse = { ok: true, state };
          sendResponse(r);
          return;
        }
        case "SIGN_OUT": {
          await clearToken();
          const r: SignOutResponse = { ok: true };
          sendResponse(r);
          return;
        }
        case "OPEN_SIGN_IN": {
          await openSignInTab();
          sendResponse({ ok: true });
          return;
        }
        case "GET_ACTIVE_TAB": {
          const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (!tab || tab.id == null || !tab.url) {
            sendResponse({ ok: false });
            return;
          }
          const r: GetActiveTabResponse = {
            ok: true,
            tabId: tab.id,
            url: tab.url,
            title: tab.title || "",
          };
          sendResponse(r);
          return;
        }
        case "LINK_TOKEN": {
          await saveToken(message.token, message.expiresAt);
          // Close the linking tab if the message came from one.
          if (sender.tab?.id != null) {
            try {
              await chrome.tabs.remove(sender.tab.id);
            } catch {
              // best-effort
            }
          }
          sendResponse({ ok: true });
          return;
        }
      }
    })();
    return true; // keep the message channel open for async sendResponse
  },
);
