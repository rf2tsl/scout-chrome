// Background service worker. Owns:
//   - token storage + sign-in flow handoff
//   - active-job lifecycle (start optimize → poll → done) so it survives popup close
//   - toolbar badge (•/!) signaling completion when popup is closed

import { API_BASE_URL, EXTENSION_LINK_PATH, WEB_APP_BASE_URL } from "@/shared/config";
import type { ExtractedListing } from "@/shared/types";
import {
  type ActiveJob,
  JOB_STORAGE_KEY,
  type OptimizationSummary,
  clearJob,
  loadJob,
  saveJob,
} from "@/shared/jobStore";
import {
  type AuthChangedEvent,
  type FillFromValuesViaTabRequest,
  type GetActiveTabResponse,
  type GetAuthStateResponse,
  type InjectAutofillRequest,
  type InjectAutofillResponse,
  type PanelToBackground,
  type SignOutResponse,
  type JobStartOptimizeResponse,
  type JobResetResponse,
} from "@/shared/messages";
import {
  TOKEN_STORAGE_KEY,
  clearToken,
  loadToken,
  saveToken,
} from "@/shared/storage";
import type { AuthState, LockedDraft } from "@/shared/types";

// The toolbar action opens the popup directly via manifest's
// `action.default_popup`, so no chrome.sidePanel wiring is needed.

const POLL_ALARM = "scout.poll-optimization";
const POLL_PERIOD_MIN = 0.5; // 30s — Chrome MV3 production minimum

// ─── Auth state ───────────────────────────────────────────────────────────

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
    // No popup open; popup will read fresh on next mount.
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (TOKEN_STORAGE_KEY in changes) void broadcastAuth();
});

// ─── Sign-in flow ────────────────────────────────────────────────────────

async function openSignInTab(): Promise<void> {
  await chrome.tabs.create({ url: `${WEB_APP_BASE_URL}${EXTENSION_LINK_PATH}` });
}

interface LinkTokenMessage {
  kind: "LINK_TOKEN";
  token: string;
  expiresAt: string;
}

// ─── Backend client ──────────────────────────────────────────────────────

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const stored = await loadToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (stored) headers.set("Authorization", `Bearer ${stored.token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

function camelize<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) return input.map((v) => camelize(v)) as unknown as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      const ck = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      out[ck] = camelize(v);
    }
    return out as T;
  }
  return input as T;
}

async function fetchOptimization(id: number): Promise<OptimizationSummary> {
  const res = await authedFetch(`/api/resume/optimizations/${id}/`);
  if (!res.ok) throw new Error(`fetch optimization ${id} failed: ${res.status}`);
  const raw = await res.json();
  const c = camelize<OptimizationSummary>(raw);
  return {
    id: c.id,
    status: c.status,
    errorMessage: c.errorMessage ?? "",
    changeSummary: c.changeSummary ?? [],
    recruiterReview: c.recruiterReview ?? "",
    completedAt: c.completedAt ?? null,
  };
}

// ─── Autofill injection ──────────────────────────────────────────────────

function isInjectableUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (["chrome:", "chrome-extension:", "edge:", "about:"].includes(u.protocol)) return false;
    if (u.protocol === "view-source:") return false;
    if (u.hostname === "chrome.google.com" && u.pathname.startsWith("/webstore")) return false;
    return ["http:", "https:", "file:"].includes(u.protocol);
  } catch {
    return false;
  }
}

async function injectAutofill(tabId: number): Promise<InjectAutofillResponse> {
  let tab: chrome.tabs.Tab | undefined;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (err) {
    return { ok: false, error: `tab ${tabId} not found` };
  }
  if (!isInjectableUrl(tab.url || "")) {
    return { ok: false, error: "Can't run on this page." };
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-autofill.js"],
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "injection failed",
    };
  }
}

async function fetchLockedDraft(
  boardSlug: string,
  atsExternalId: string,
): Promise<{ ok: true; draft: LockedDraft | null } | { ok: false; error: string }> {
  try {
    const resp = await authedFetch(
      `/api/applicant/drafts/by-ats/?board_slug=${encodeURIComponent(boardSlug)}` +
      `&ats_external_id=${encodeURIComponent(atsExternalId)}`,
    );
    if (resp.status === 404) return { ok: true, draft: null };
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const raw = await resp.json();
    return { ok: true, draft: camelize<LockedDraft>(raw) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

// ─── Capture lifecycle ───────────────────────────────────────────────────

interface PageSnapshot {
  url: string;
  title: string;
  text: string;
}

// Runs in the page context. Cannot reference module scope.
function snapshotPageInTab(maxChars: number): PageSnapshot {
  return {
    url: location.href,
    title: document.title,
    text: (document.body?.innerText || "").slice(0, maxChars),
  };
}

async function startCapture(tabId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  // Look up the tab so we can store hostname/title/url for "capturing" UI
  // and for downstream display if extraction fails.
  let tab: chrome.tabs.Tab | undefined;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (err) {
    return { ok: false, error: `tab ${tabId} not found` };
  }
  const url = tab.url || "";
  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  const title = tab.title || "";

  await saveJob({
    kind: "capturing",
    tabId,
    url,
    hostname,
    title,
    startedAt: new Date().toISOString(),
  });

  // Snapshot the page via scripting (works regardless of orphaned content scripts).
  let snapshot: PageSnapshot;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: snapshotPageInTab,
      args: [30_000],
    });
    if (!result?.result || typeof result.result !== "object") {
      throw new Error("no snapshot returned");
    }
    snapshot = result.result as PageSnapshot;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "snapshot failed";
    await saveJob({
      kind: "failed",
      phase: "capture",
      message: `${msg}. Pages like chrome:// and the Web Store don't allow extension scripts.`,
      hostname,
      failedAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  // Send to backend for AI extraction.
  let listing: ExtractedListing;
  try {
    const res = await authedFetch("/api/discover/extract-listing/", {
      method: "POST",
      body: JSON.stringify({
        url: snapshot.url,
        page_title: snapshot.title,
        page_text: snapshot.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`backend ${res.status}: ${body.slice(0, 120)}`);
    }
    listing = (await res.json()) as ExtractedListing;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "extraction failed";
    await saveJob({
      kind: "failed",
      phase: "capture",
      message: msg,
      hostname,
      failedAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  await saveJob({
    kind: "captured",
    listing,
    hostname,
    capturedAt: new Date().toISOString(),
  });
  return { ok: true };
}

// ─── Optimization lifecycle ──────────────────────────────────────────────

async function startOptimization(): Promise<{ ok: true } | { ok: false; error: string }> {
  const job = await loadJob();
  if (!job || job.kind !== "captured") {
    return { ok: false, error: "no captured listing to optimize" };
  }

  const text = [
    job.listing.title && `Title: ${job.listing.title}`,
    job.listing.company && `Company: ${job.listing.company}`,
    job.listing.location && `Location: ${job.listing.location}`,
    "",
    job.listing.description_markdown,
  ]
    .filter(Boolean)
    .join("\n");
  const title = job.listing.company
    ? `${job.listing.title || "Role"} at ${job.listing.company}`
    : job.listing.title || "Pasted listing";

  let createRes: Response;
  try {
    createRes = await authedFetch("/api/resume/optimizations/", {
      method: "POST",
      body: JSON.stringify({
        job_context_kind: "pasted",
        job_context_title: title,
        job_context_text: text,
      }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "create failed" };
  }
  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    return { ok: false, error: `create failed (${createRes.status}): ${body.slice(0, 120)}` };
  }
  const created = camelize<{ id: number; status: string }>(await createRes.json());

  const optimizing: ActiveJob = {
    kind: "optimizing",
    listing: job.listing,
    hostname: job.hostname,
    optimizationId: created.id,
    startedAt: new Date().toISOString(),
  };
  await saveJob(optimizing);
  // Live status bar — design's "Live scraping" variant. Teal background, dark
  // text. setBadgeTextColor lands in Chrome 110+; safe to call.
  await chrome.action.setBadgeText({ text: "LIVE" });
  await chrome.action.setBadgeBackgroundColor({ color: "#00d4aa" });
  await chrome.action.setBadgeTextColor({ color: "#07090d" });

  // Schedule periodic polling. Also tick once immediately.
  await chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MIN });
  await pollOptimizationOnce();
  return { ok: true };
}

async function pollOptimizationOnce(): Promise<void> {
  const job = await loadJob();
  if (!job || job.kind !== "optimizing") {
    await chrome.alarms.clear(POLL_ALARM);
    return;
  }

  let summary: OptimizationSummary;
  try {
    summary = await fetchOptimization(job.optimizationId);
  } catch (err) {
    console.warn("[scout-bg] poll failed (will retry):", err);
    return; // keep polling; transient errors shouldn't kill the job
  }

  if (summary.status === "succeeded") {
    const completed: ActiveJob = {
      kind: "completed",
      listing: job.listing,
      hostname: job.hostname,
      optimizationId: job.optimizationId,
      summary,
      completedAt: new Date().toISOString(),
    };
    await saveJob(completed);
    await chrome.alarms.clear(POLL_ALARM);
    // "AI insight ready" — design's sparkle glyph in amber.
    await chrome.action.setBadgeText({ text: "✦" });
    await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
    await chrome.action.setBadgeTextColor({ color: "#1a1a20" });
  } else if (summary.status === "failed") {
    const failed: ActiveJob = {
      kind: "failed",
      phase: "optimize",
      listing: job.listing,
      hostname: job.hostname,
      optimizationId: job.optimizationId,
      message: summary.errorMessage || "optimization failed",
      failedAt: new Date().toISOString(),
    };
    await saveJob(failed);
    await chrome.alarms.clear(POLL_ALARM);
    // Urgent — design's danger red.
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    await chrome.action.setBadgeTextColor({ color: "#ffffff" });
  }
  // else: still running — alarm will fire again
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== POLL_ALARM) return;
  void pollOptimizationOnce();
});

// On SW startup, if we left an "optimizing" job behind, re-arm the alarm.
(async () => {
  const job = await loadJob();
  if (job?.kind === "optimizing") {
    await chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MIN });
    void pollOptimizationOnce();
  }
})();

// Storage changes drive the badge for state we didn't trigger ourselves
// (e.g. popup writes "captured", popup writes "idle" via JOB_RESET).
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !(JOB_STORAGE_KEY in changes)) return;
  const next = changes[JOB_STORAGE_KEY]?.newValue as ActiveJob | undefined;
  if (!next) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  if (next.kind === "captured") {
    await chrome.action.setBadgeText({ text: "" });
  }
});

// ─── Message router ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message:
      | PanelToBackground
      | LinkTokenMessage
      | { kind: "JOB_START_CAPTURE"; tabId: number }
      | { kind: "JOB_START_OPTIMIZE" }
      | { kind: "JOB_RESET" }
      | { kind: "FETCH_LOCKED_DRAFT"; boardSlug: string; atsExternalId: string }
      | FillFromValuesViaTabRequest,
    sender,
    sendResponse,
  ): boolean => {
    // Content-script branches — distinguished by sender.tab?.id being present.
    // Panel messages come from the extension popup: sender.tab is undefined.
    // Content-script messages have sender.tab.id set by Chrome.
    const msg = message;
    if (msg.kind === "INJECT_AUTOFILL" && sender.tab?.id) {
      // Content-script caller: use the sender's own tab instead of msg.tabId.
      void injectAutofill(sender.tab.id).then(sendResponse);
      return true;
    }
    if (msg.kind === "FILL_FROM_VALUES_VIA_TAB" && sender.tab?.id) {
      const tabId = sender.tab.id;
      chrome.tabs.sendMessage(
        tabId,
        { kind: "FILL_FROM_VALUES", values: (msg as FillFromValuesViaTabRequest).values },
        (resp) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              ok: false,
              error: chrome.runtime.lastError.message ?? "no response",
            });
          } else {
            sendResponse(resp);
          }
        },
      );
      return true;
    }

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
          await clearJob();
          await chrome.alarms.clear(POLL_ALARM);
          await chrome.action.setBadgeText({ text: "" });
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
          const [tab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          });
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
        case "INJECT_AUTOFILL": {
          // Panel caller: uses explicit msg.tabId.
          const m = message as InjectAutofillRequest;
          const r = await injectAutofill(m.tabId);
          sendResponse(r);
          return;
        }
        case "LINK_TOKEN": {
          const m = message as LinkTokenMessage;
          await saveToken(m.token, m.expiresAt);
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
        case "JOB_START_CAPTURE": {
          const m = message as { kind: "JOB_START_CAPTURE"; tabId: number };
          const r = await startCapture(m.tabId);
          sendResponse(r);
          return;
        }
        case "JOB_START_OPTIMIZE": {
          const r: JobStartOptimizeResponse = await startOptimization();
          sendResponse(r);
          return;
        }
        case "JOB_RESET": {
          await clearJob();
          await chrome.alarms.clear(POLL_ALARM);
          await chrome.action.setBadgeText({ text: "" });
          const r: JobResetResponse = { ok: true };
          sendResponse(r);
          return;
        }
        case "FETCH_LOCKED_DRAFT": {
          const m = message as { kind: "FETCH_LOCKED_DRAFT"; boardSlug: string; atsExternalId: string };
          const r = await fetchLockedDraft(m.boardSlug, m.atsExternalId);
          sendResponse(r);
          return;
        }
      }
    })();
    return true;
  },
);

// Clear badge when popup opens. Popups have no API for "I opened" — but the
// popup mounts useAuth which sends GET_AUTH_STATE. That's our trigger.
let lastBadgeClearAt = 0;
chrome.runtime.onMessage.addListener((message) => {
  if (message?.kind !== "GET_AUTH_STATE") return false;
  const now = Date.now();
  if (now - lastBadgeClearAt < 500) return false;
  lastBadgeClearAt = now;
  void chrome.action.setBadgeText({ text: "" });
  return false;
});
