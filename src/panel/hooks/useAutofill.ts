import { useCallback, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/shared/api";
import { toUserMessage } from "@/shared/userError";
import type {
  ApplicantProfile,
  AutofillResponse,
  FieldSpec,
  FieldValue,
} from "@/shared/types";
import type {
  FillFormRequest,
  FillFormResponse,
  InjectAutofillRequest,
  InjectAutofillResponse,
  ScanFormRequest,
  ScanFormResponse,
} from "@/shared/messages";

// camelCase the response. snake_case <-> camelCase is the convention used
// by the panel (see useOptimization.ts).
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

function decamelize<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
  }
  return out;
}

export type AutofillState =
  | { kind: "idle" }
  | { kind: "scanning" }
  | {
      kind: "reviewing";
      schema: FieldSpec[];
      response: AutofillResponse;
      values: Record<string, FieldValue>;
      profile: ApplicantProfile;
      saveProfile: boolean;
      manuallyEdited: Set<string>;
    }
  | { kind: "filling" }
  | { kind: "done"; filled: number; failed: string[]; profileSaved: boolean }
  | { kind: "error"; message: string };

interface UseAutofill {
  state: AutofillState;
  scan: (optimizationId: number, tabId: number) => Promise<void>;
  setValue: (fieldId: string, value: FieldValue) => void;
  setProfileField: <K extends keyof ApplicantProfile>(key: K, value: ApplicantProfile[K]) => void;
  setSaveProfile: (v: boolean) => void;
  fill: (tabId: number) => Promise<void>;
  reset: () => void;
}

export function useAutofill(): UseAutofill {
  const [state, setState] = useState<AutofillState>({ kind: "idle" });
  const tabIdRef = useRef<number | null>(null);

  const scan = useCallback(async (optimizationId: number, tabId: number) => {
    setState({ kind: "scanning" });
    tabIdRef.current = tabId;

    // 1. Inject the content script.
    const inject: InjectAutofillRequest = { kind: "INJECT_AUTOFILL", tabId };
    let injected: InjectAutofillResponse;
    try {
      injected = (await chrome.runtime.sendMessage(inject)) as InjectAutofillResponse;
    } catch (err) {
      setState({ kind: "error", message: toUserMessage(err) });
      return;
    }
    if (!injected.ok) {
      setState({ kind: "error", message: injected.error });
      return;
    }

    // 2. Ask the content script to scan.
    const scanReq: ScanFormRequest = { kind: "SCAN_FORM" };
    let scanRes: ScanFormResponse;
    try {
      scanRes = (await chrome.tabs.sendMessage(tabId, scanReq)) as ScanFormResponse;
    } catch (err) {
      setState({ kind: "error", message: "Couldn't read the page. Reload and try again." });
      return;
    }
    if (!scanRes.ok) {
      setState({ kind: "error", message: scanRes.error });
      return;
    }
    if (scanRes.fields.length === 0) {
      setState({ kind: "error", message: "No form fields detected on this page." });
      return;
    }

    // 3. POST to backend.
    let response: AutofillResponse;
    try {
      const raw = await apiFetch<unknown>("/api/applicant/autofill/", {
        method: "POST",
        body: JSON.stringify({
          optimization_id: optimizationId,
          schema: scanRes.fields,
        }),
      });
      response = camelize<AutofillResponse>(raw);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 400
          ? "Optimization unavailable. Pick another."
          : toUserMessage(err);
      setState({ kind: "error", message: msg });
      return;
    }

    setState({
      kind: "reviewing",
      schema: scanRes.fields,
      response,
      values: { ...response.values },
      profile: { ...response.profile },
      saveProfile: true,
      manuallyEdited: new Set(),
    });
  }, []);

  const setValue = useCallback((fieldId: string, value: FieldValue) => {
    setState((prev) => {
      if (prev.kind !== "reviewing") return prev;
      const manuallyEdited = new Set(prev.manuallyEdited);
      manuallyEdited.add(fieldId);
      return { ...prev, values: { ...prev.values, [fieldId]: value }, manuallyEdited };
    });
  }, []);

  const setProfileField = useCallback(
    <K extends keyof ApplicantProfile>(key: K, value: ApplicantProfile[K]) => {
      setState((prev) => {
        if (prev.kind !== "reviewing") return prev;
        const profile = { ...prev.profile, [key]: value };
        // Re-derive any matched form values from this profile attribute,
        // unless the user has manually edited that field.
        const values = { ...prev.values };
        for (const [fieldId, attr] of Object.entries(prev.response.matched)) {
          if (attr !== key) continue;
          if (prev.manuallyEdited.has(fieldId)) continue;
          values[fieldId] = String(value ?? "");
        }
        return { ...prev, profile, values };
      });
    },
    [],
  );

  const setSaveProfile = useCallback((v: boolean) => {
    setState((prev) => (prev.kind === "reviewing" ? { ...prev, saveProfile: v } : prev));
  }, []);

  const fill = useCallback(async (tabId: number) => {
    let snapshot: AutofillState | null = null;
    setState((prev) => {
      if (prev.kind !== "reviewing") return prev;
      snapshot = prev;
      return { kind: "filling" };
    });
    if (!snapshot || (snapshot as AutofillState).kind !== "reviewing") return;

    const { values, profile, saveProfile } = snapshot as Extract<AutofillState, { kind: "reviewing" }>;

    const profileSavePromise: Promise<boolean> = saveProfile
      ? apiFetch("/api/applicant/profile/", {
          method: "PATCH",
          body: JSON.stringify(decamelize(profile as unknown as Record<string, unknown>)),
        })
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(true);

    const fillReq: FillFormRequest = { kind: "FILL_FORM", values };
    let fillRes: FillFormResponse;
    try {
      fillRes = (await chrome.tabs.sendMessage(tabId, fillReq)) as FillFormResponse;
    } catch (err) {
      setState({ kind: "error", message: "Couldn't reach the page. Try Scan again." });
      return;
    }

    const profileSaved = await profileSavePromise;
    if (!fillRes.ok) {
      setState({ kind: "error", message: fillRes.error });
      return;
    }
    setState({
      kind: "done",
      filled: fillRes.filled,
      failed: fillRes.failed,
      profileSaved,
    });
  }, []);

  const reset = useCallback(() => {
    setState({ kind: "idle" });
    tabIdRef.current = null;
  }, []);

  return { state, scan, setValue, setProfileField, setSaveProfile, fill, reset };
}
