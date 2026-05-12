// Autofill content script. Loaded on-demand via chrome.scripting.executeScript
// when the panel asks the background to inject it.
//
// Exposes via chrome.runtime.onMessage:
//   SCAN_FORM  -> { fields: FieldSpec[] }
//   FILL_FORM  -> { filled: number, failed: string[] }
//
// Self-contained — no module-scope side effects beyond registering the
// listener. Runs in the page world; cannot reference @/ aliases (the script
// is bundled as IIFE before injection).

// Idempotent install guard — each Scan triggers a fresh injection.
// Cast to any to attach a flag without a global augmentation (this file has no imports).
type ScoutWindow = Window & { __scoutAutofillInstalled?: boolean };

interface FieldSpec {
  id: string;
  label: string;
  kind: "text" | "textarea" | "select" | "multiselect" | "yesno" | "checkbox";
  required: boolean;
  options?: string[];
  hint?: string;
}

type FieldValue = string | string[] | boolean;

const FID_ATTR = "data-scout-fid";

// ─── Label resolution ────────────────────────────────────────────────────

function resolveLabel(el: Element): string {
  // 1) <label for=…>
  if (el instanceof HTMLElement && el.id) {
    const lbl = document.querySelector<HTMLLabelElement>(`label[for="${cssEscape(el.id)}"]`);
    if (lbl) return cleanText(lbl.textContent || "");
  }
  // 2) wrapping <label>
  const wrap = el.closest("label");
  if (wrap) {
    // Strip out the input's own text content
    const cloned = wrap.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll("input, select, textarea").forEach((n) => n.remove());
    const text = cleanText(cloned.textContent || "");
    if (text) return text;
  }
  // 3) aria-label
  const aria = (el as HTMLElement).getAttribute?.("aria-label");
  if (aria) return cleanText(aria);
  // 4) aria-labelledby
  const labelledby = (el as HTMLElement).getAttribute?.("aria-labelledby");
  if (labelledby) {
    const parts = labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || "")
      .filter(Boolean);
    if (parts.length) return cleanText(parts.join(" "));
  }
  // 5) placeholder
  const ph = (el as HTMLInputElement).placeholder;
  if (ph) return cleanText(ph);
  // 6) nearest preceding text — walk previous siblings up to 3 nodes
  let cur: Node | null = el.previousSibling;
  let hops = 0;
  while (cur && hops < 5) {
    const txt = (cur.textContent || "").trim();
    if (txt) return cleanText(txt);
    cur = cur.previousSibling;
    hops++;
  }
  return "";
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").replace(/\*$/, "").trim();
}

function cssEscape(s: string): string {
  // Avoid CSS.escape compat issues by escaping a minimal set.
  return s.replace(/(["\\])/g, "\\$1");
}

// ─── Scan ────────────────────────────────────────────────────────────────

function newFid(): string {
  return "scout-" + Math.random().toString(36).slice(2, 10);
}

function ensureId(el: HTMLElement): string {
  if (el.id) return el.id;
  let fid = el.getAttribute(FID_ATTR);
  if (!fid) {
    fid = newFid();
    el.setAttribute(FID_ATTR, fid);
  }
  return fid;
}

function inputKind(el: HTMLInputElement): FieldSpec["kind"] | null {
  // React-style combobox widgets (react-select, Headless UI, Downshift, Radix)
  // render their visible control as an <input role="combobox"> with the
  // options portaled into a separate <ul role="listbox">. Treat these as
  // selects, not as plain text inputs.
  if (
    el.getAttribute("role") === "combobox" &&
    el.getAttribute("aria-haspopup") === "true"
  ) {
    return el.getAttribute("aria-multiselectable") === "true" ? "multiselect" : "select";
  }
  switch (el.type) {
    case "text":
    case "email":
    case "tel":
    case "url":
    case "search":
    case "number":
      return "text";
    case "checkbox":
      return "checkbox";
    default:
      return null;
  }
}

function isVisible(el: HTMLElement): boolean {
  if ((el as HTMLInputElement).type === "hidden") return false;
  // Many React combobox libraries (react-select, Headless UI, Downshift) ship
  // hidden sentinel inputs to trigger native required-validation. They are
  // marked aria-hidden + tabindex=-1 and offscreen-positioned via CSS. Skip
  // them — picking them up creates phantom duplicate fields in the review UI.
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (
    el.getAttribute("tabindex") === "-1" &&
    /requiredInput/i.test(el.className || "")
  ) {
    return false;
  }
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  if (el.offsetParent === null && cs.position !== "fixed") return false;
  return true;
}

function buildHint(el: HTMLElement): string {
  const parts: string[] = [];
  const name = (el as HTMLInputElement).name;
  if (name) parts.push(name);
  const ac = el.getAttribute("autocomplete");
  if (ac) parts.push(ac);
  if (el.id) parts.push(el.id);
  return parts.join(" ");
}

/**
 * Open a combobox programmatically, scrape the option labels from the
 * listbox referenced by `aria-controls`, then close it. Best-effort: any
 * failure returns an empty array so the field falls back to text input.
 */
async function scrapeComboboxOptions(input: HTMLElement): Promise<string[]> {
  try {
    input.focus();
    // ArrowDown is the canonical "open menu" key for the WAI-ARIA combobox
    // pattern; works across react-select, Headless UI, and Downshift.
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowDown", code: "ArrowDown", bubbles: true,
    }));

    // One rAF + 50ms is empirically enough for react-select's portal to render.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 50)),
    );

    const listboxId = input.getAttribute("aria-controls");
    const listbox = listboxId ? document.getElementById(listboxId) : null;
    const opts = listbox
      ? Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'))
          .map((o) => cleanText(o.textContent || ""))
          .filter(Boolean)
      : [];

    // Escape closes the menu without committing any option.
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape", code: "Escape", bubbles: true,
    }));
    input.blur();
    return opts;
  } catch (err) {
    console.warn("[scout-autofill] combobox scrape failed", err);
    return [];
  }
}

const COMBOBOX_SCRAPE_CAP = 20;

async function scanForm(): Promise<FieldSpec[]> {
  const out: FieldSpec[] = [];
  const seenRadioGroups = new Set<string>();

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("input, textarea, select"),
  );

  let comboboxScrapesUsed = 0;

  for (const el of elements) {
    if (!isVisible(el)) continue;

    if (el instanceof HTMLInputElement) {
      if (el.type === "radio") {
        const groupKey = el.name || ensureId(el);
        if (seenRadioGroups.has(groupKey)) continue;
        seenRadioGroups.add(groupKey);

        const peers = el.name
          ? Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${cssEscape(el.name)}"]`))
          : [el];
        const visiblePeers = peers.filter(isVisible);
        if (!visiblePeers.length) continue;
        const firstPeer = visiblePeers[0] as HTMLInputElement;
        const options = visiblePeers
          .map((p) => resolveLabel(p))
          .filter(Boolean);
        const isYesNo =
          options.length === 2 &&
          options.every((o) => /^(yes|no)$/i.test(o));
        const id = ensureId(firstPeer);
        const fieldset = firstPeer.closest("fieldset");
        const legend = fieldset?.querySelector("legend")?.textContent || "";
        out.push({
          id,
          label: cleanText(legend) || resolveLabel(firstPeer.parentElement ?? firstPeer),
          kind: isYesNo ? "yesno" : "select",
          required: visiblePeers.some((p) => p.required),
          options,
          hint: buildHint(firstPeer),
        });
        continue;
      }
      const kind = inputKind(el);
      if (!kind) continue;

      let options: string[] = [];
      if ((kind === "select" || kind === "multiselect") && el.getAttribute("role") === "combobox") {
        if (comboboxScrapesUsed < COMBOBOX_SCRAPE_CAP) {
          options = await scrapeComboboxOptions(el);
          comboboxScrapesUsed++;
        } else {
          console.warn("[scout-autofill] combobox scrape cap reached; skipping option scrape");
        }
      }

      out.push({
        id: ensureId(el),
        label: resolveLabel(el),
        kind,
        required: el.required,
        options,
        hint: buildHint(el),
      });
      continue;
    }
    if (el instanceof HTMLTextAreaElement) {
      out.push({
        id: ensureId(el),
        label: resolveLabel(el),
        kind: "textarea",
        required: el.required,
        options: [],
        hint: buildHint(el),
      });
      continue;
    }
    if (el instanceof HTMLSelectElement) {
      const options = Array.from(el.options)
        .filter((o) => o.value && o.text)
        .map((o) => o.text);
      const isYesNo =
        options.length === 2 && options.every((o) => /^(yes|no)$/i.test(o));
      out.push({
        id: ensureId(el),
        label: resolveLabel(el),
        kind: el.multiple ? "multiselect" : isYesNo ? "yesno" : "select",
        required: el.required,
        options,
        hint: buildHint(el),
      });
      continue;
    }
  }

  return out;
}

// ─── Fill ────────────────────────────────────────────────────────────────

function findElementById(id: string): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(`[${FID_ATTR}="${cssEscape(id)}"]`) ||
    document.getElementById(id)
  );
}

function dispatch(el: Element) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setText(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  // React-controlled inputs intercept the prototype setter; setting via the
  // native descriptor and dispatching `input` is the canonical workaround.
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (desc?.set) desc.set.call(el, value);
  else el.value = value;
  dispatch(el);
}

function setCheckbox(el: HTMLInputElement, checked: boolean) {
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  if (desc?.set) desc.set.call(el, checked);
  else el.checked = checked;
  dispatch(el);
}

function setSelect(el: HTMLSelectElement, value: string | string[]) {
  const wanted = Array.isArray(value) ? value : [value];
  const wantedNorm = new Set(wanted.map((v) => v.trim().toLowerCase()));
  let any = false;
  for (const opt of Array.from(el.options)) {
    const match =
      wantedNorm.has(opt.value.toLowerCase()) ||
      wantedNorm.has(opt.text.trim().toLowerCase());
    opt.selected = match;
    if (match) any = true;
  }
  if (!any && wanted.length) return false;
  dispatch(el);
  return any;
}

function setRadioGroup(el: HTMLInputElement, value: string | boolean): boolean {
  const target = typeof value === "boolean" ? (value ? "yes" : "no") : value;
  const targetNorm = String(target).trim().toLowerCase();
  const peers = el.name
    ? Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${cssEscape(el.name)}"]`))
    : [el];
  for (const p of peers) {
    const lbl = resolveLabel(p).trim().toLowerCase();
    if (lbl === targetNorm || p.value.trim().toLowerCase() === targetNorm) {
      p.checked = true;
      dispatch(p);
      return true;
    }
  }
  return false;
}

/**
 * Fill a react-select-style combobox by simulating the typeahead-then-Enter
 * user flow. Returns true if an option was committed; false if no option
 * matched the typed value.
 */
async function fillCombobox(input: HTMLInputElement, value: string): Promise<boolean> {
  try {
    input.focus();

    // Type the value via the native setter so react-select sees it.
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    desc?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // One rAF + ~80ms for react-select to filter the list and highlight the
    // first match.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 80)),
    );

    // If no option got rendered, the typed value didn't match anything.
    const listboxId = input.getAttribute("aria-controls");
    const listbox = listboxId ? document.getElementById(listboxId) : null;
    const firstOption = listbox?.querySelector<HTMLElement>('[role="option"]') ?? null;
    if (!firstOption) {
      input.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape", code: "Escape", bubbles: true,
      }));
      input.blur();
      return false;
    }

    // Enter commits the highlighted (first) option.
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter", code: "Enter", bubbles: true,
    }));
    input.blur();
    return true;
  } catch (err) {
    console.warn("[scout-autofill] combobox fill failed", err);
    return false;
  }
}

async function fillForm(values: Record<string, FieldValue>): Promise<{ filled: number; failed: string[] }> {
  let filled = 0;
  const failed: string[] = [];
  for (const [id, value] of Object.entries(values)) {
    const el = findElementById(id);
    if (!el) {
      failed.push(id);
      continue;
    }
    try {
      if (el instanceof HTMLTextAreaElement) {
        setText(el, String(value));
        filled++;
      } else if (el instanceof HTMLSelectElement) {
        if (setSelect(el, value as string | string[])) filled++;
        else failed.push(id);
      } else if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox") {
          setCheckbox(el, Boolean(value));
          filled++;
        } else if (el.type === "radio") {
          if (setRadioGroup(el, value as string | boolean)) filled++;
          else failed.push(id);
        } else if (el.getAttribute("role") === "combobox") {
          // Multi-select: loop and commit each value.
          if (Array.isArray(value)) {
            let allOk = true;
            for (const v of value) {
              const ok = await fillCombobox(el, String(v));
              if (!ok) allOk = false;
            }
            if (allOk) filled++;
            else failed.push(id);
          } else {
            const ok = await fillCombobox(el, String(value));
            if (ok) filled++;
            else failed.push(id);
          }
        } else {
          setText(el, String(value));
          filled++;
        }
      } else {
        failed.push(id);
      }
    } catch (e) {
      console.warn("[scout-autofill] fill failed", id, e);
      failed.push(id);
    }
  }
  return { filled, failed };
}

// ─── Message router ──────────────────────────────────────────────────────

if (!(window as ScoutWindow).__scoutAutofillInstalled) {
  (window as ScoutWindow).__scoutAutofillInstalled = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.kind === "SCAN_FORM") {
      scanForm()
        .then((fields) => sendResponse({ ok: true, fields }))
        .catch((err) =>
          sendResponse({ ok: false, error: err instanceof Error ? err.message : "scan failed" }),
        );
      return true; // keep channel open for async sendResponse
    }
    if (message?.kind === "FILL_FORM") {
      fillForm(message.values || {})
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) =>
          sendResponse({ ok: false, error: err instanceof Error ? err.message : "fill failed" }),
        );
      return true; // keep channel open for async sendResponse
    }
    return false;
  });
}
