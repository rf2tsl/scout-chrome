// Apply-page banner content script.
// Runs on Greenhouse apply URLs. Fetches the user's locked Scout draft for
// the URL's board+job. If one exists and hasn't been dismissed for this
// locked_at, injects a Shadow-DOM banner offering one-click form fill.
//
// Self-contained — no @/ imports; bundled as IIFE.

interface LockedDraft {
  answers: Record<string, unknown>;
  schema: { questions: unknown[] } | null;
  lockedAt: string;
  job: { id: number; company: string; title: string };
}

interface BannerDismissalEntry {
  lockedAt: string;
}

const DISMISS_PREFIX = "applyBanner:";

function parseGreenhouseUrl(): { boardSlug: string; atsExternalId: string } | null {
  const m = location.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
  if (!m) return null;
  return { boardSlug: m[1]!, atsExternalId: m[2]! };
}

async function fetchDraft(
  boardSlug: string,
  atsExternalId: string,
): Promise<LockedDraft | null> {
  const resp = await chrome.runtime.sendMessage({
    kind: "FETCH_LOCKED_DRAFT", boardSlug, atsExternalId,
  });
  if (!resp || !resp.ok) return null;
  return resp.draft;
}

async function getDismissal(): Promise<BannerDismissalEntry | null> {
  const key = DISMISS_PREFIX + location.href;
  const stored = await chrome.storage.local.get(key);
  return (stored[key] as BannerDismissalEntry | undefined) ?? null;
}

async function setDismissal(lockedAt: string): Promise<void> {
  await chrome.storage.local.set({
    [DISMISS_PREFIX + location.href]: { lockedAt } satisfies BannerDismissalEntry,
  });
}

function injectBanner(draft: LockedDraft) {
  if (document.getElementById("scout-apply-banner-host")) return;

  const host = document.createElement("div");
  host.id = "scout-apply-banner-host";
  host.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      .bar {
        pointer-events: auto;
        font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
        background: #0a0e14;
        color: #e6edf3;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        border-bottom: 1px solid #1f2937;
      }
      .title { flex: 1; }
      .title strong { color: #7ee7c3; }
      button {
        font: inherit;
        cursor: pointer;
        border: 0;
        padding: 6px 12px;
        border-radius: 4px;
      }
      .fill { background: #7ee7c3; color: #0a0e14; font-weight: 600; }
      .dismiss { background: transparent; color: #9ca3af; }
      .status { color: #9ca3af; }
    </style>
    <div class="bar" role="region" aria-label="Scout autofill">
      <span class="title"><strong>Scout</strong> has saved answers for this job.</span>
      <span class="status" id="status"></span>
      <button class="fill" id="fill">Fill now</button>
      <button class="dismiss" id="dismiss">Dismiss</button>
    </div>
  `;
  document.documentElement.appendChild(host);

  const statusEl = shadow.getElementById("status")!;
  const fillBtn = shadow.getElementById("fill") as HTMLButtonElement;
  const dismissBtn = shadow.getElementById("dismiss") as HTMLButtonElement;

  fillBtn.addEventListener("click", async () => {
    fillBtn.disabled = true;
    statusEl.textContent = "Filling…";
    // Background derives the target tab from sender.tab.id for content-
    // script-sourced INJECT_AUTOFILL messages — don't pass tabId here.
    const inj = await chrome.runtime.sendMessage({ kind: "INJECT_AUTOFILL" });
    if (!inj?.ok) {
      statusEl.textContent = "Couldn't inject autofill.";
      fillBtn.disabled = false;
      return;
    }
    const result = await chrome.runtime.sendMessage({
      kind: "FILL_FROM_VALUES_VIA_TAB",
      values: draft.answers,
    });
    if (!result?.ok) {
      statusEl.textContent = "Fill failed.";
      fillBtn.disabled = false;
      return;
    }
    const { filled, failed } = result;
    const total = Object.keys(draft.answers).length;
    if (failed.length > total / 2) {
      statusEl.textContent = `Filled ${filled}, ${failed.length} need attention — open Scout panel to retry.`;
    } else {
      statusEl.textContent = `Filled ${filled} field${filled === 1 ? "" : "s"}${failed.length ? `, ${failed.length} skipped` : ""}.`;
    }
  });

  dismissBtn.addEventListener("click", () => {
    void setDismissal(draft.lockedAt);
    host.remove();
  });
}

async function main() {
  const ids = parseGreenhouseUrl();
  if (!ids) return;

  const draft = await fetchDraft(ids.boardSlug, ids.atsExternalId);
  if (!draft) return;

  const dismissed = await getDismissal();
  if (dismissed && dismissed.lockedAt === draft.lockedAt) return;

  injectBanner(draft);
}

void main();
