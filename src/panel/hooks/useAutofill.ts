import { useCallback, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/shared/api";
import { toUserMessage } from "@/shared/userError";
import type {
  ApplicantProfile,
  AutofillResponse,
  AutofillSource,
  FieldSpec,
  FieldValue,
  ProfileAttrName,
} from "@/shared/types";
import type {
  FillFormRequest,
  FillFormResponse,
  InjectAutofillRequest,
  InjectAutofillResponse,
  ScanFormRequest,
  ScanFormResponse,
} from "@/shared/messages";
import { extractListing, snapshotActiveTab } from "./listingExtract";

function camelizeProfile(p: Record<string, unknown>): ApplicantProfile {
  return {
    firstName: String(p.first_name ?? ""),
    lastName: String(p.last_name ?? ""),
    phone: String(p.phone ?? ""),
    linkedinUrl: String(p.linkedin_url ?? ""),
    portfolioUrl: String(p.portfolio_url ?? ""),
    locationCity: String(p.location_city ?? ""),
    locationCountry: String(p.location_country ?? ""),
    authorizedToWorkUs: p.authorized_to_work_us as boolean | null,
    requiresSponsorship: p.requires_sponsorship as boolean | null,
    eeocGender: String(p.eeoc_gender ?? ""),
    eeocRace: String(p.eeoc_race ?? ""),
    eeocVeteranStatus: String(p.eeoc_veteran_status ?? ""),
    eeocDisabilityStatus: String(p.eeoc_disability_status ?? ""),
  };
}

function decodeAutofillResponse(raw: unknown): AutofillResponse {
  const r = raw as Record<string, unknown>;
  return {
    values: (r.values as Record<string, FieldValue>) ?? {},
    matched: (r.matched as AutofillResponse["matched"]) ?? {},
    aiDrafted: (r.ai_drafted as string[]) ?? [],
    memoryMatched: (r.memory_matched as string[]) ?? [],
    unmatched: (r.unmatched as string[]) ?? [],
    profile: camelizeProfile((r.profile as Record<string, unknown>) ?? {}),
  };
}

const PROFILE_ATTR_TO_KEY: Record<ProfileAttrName, keyof ApplicantProfile | null> = {
  first_name: "firstName",
  last_name: "lastName",
  full_name: null, // composite — no single profile field
  email: null,     // user.email, not on profile
  phone: "phone",
  linkedin_url: "linkedinUrl",
  portfolio_url: "portfolioUrl",
  location_city: "locationCity",
  location_country: "locationCountry",
  authorized_to_work_us: "authorizedToWorkUs",
  requires_sponsorship: "requiresSponsorship",
  eeoc_gender: "eeocGender",
  eeoc_race: "eeocRace",
  eeoc_veteran_status: "eeocVeteranStatus",
  eeoc_disability_status: "eeocDisabilityStatus",
};

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
  | { kind: "extracting" }
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
  scan: (source: AutofillSource, tabId: number) => Promise<void>;
  setValue: (fieldId: string, value: FieldValue) => void;
  setProfileField: <K extends keyof ApplicantProfile>(key: K, value: ApplicantProfile[K]) => void;
  setSaveProfile: (v: boolean) => void;
  fill: (tabId: number) => Promise<void>;
  reset: () => void;
}

export function useAutofill(): UseAutofill {
  const [state, setState] = useState<AutofillState>({ kind: "idle" });
  const tabIdRef = useRef<number | null>(null);

  const scan = useCallback(async (source: AutofillSource, tabId: number) => {
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
    } catch {
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

    // 3. If the source is the base resume, extract a job context from the
    //    active tab. Failures fall through with empty context.
    let jobContext: { title: string; description: string } | undefined;
    if (source.kind === "base") {
      setState({ kind: "extracting" });
      try {
        const snap = await snapshotActiveTab(tabId);
        const listing = await extractListing(snap);
        jobContext = {
          title: listing.title || "",
          description: listing.description_markdown || "",
        };
      } catch {
        jobContext = { title: "", description: "" };
      }
    }

    // 4. POST to the autofill endpoint.
    let response: AutofillResponse;
    try {
      const body: Record<string, unknown> = {
        source,
        schema: scanRes.fields,
      };
      if (jobContext) body.job_context = jobContext;

      const raw = await apiFetch<unknown>("/api/applicant/autofill/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      response = decodeAutofillResponse(raw);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 400
          ? "Source unavailable. Pick another."
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
          const profileKey = PROFILE_ATTR_TO_KEY[attr];
          if (profileKey !== key) continue;
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

    // Fire-and-forget: commit non-profile answers to semantic memory.
    const snap = snapshot as Extract<AutofillState, { kind: "reviewing" }>;
    const profileFieldIds = new Set(Object.keys(snap.response.matched));
    const entries = snap.schema
      .filter((f) => !profileFieldIds.has(f.id) && f.kind !== "checkbox")
      .map((f) => ({ id: f.id, label: f.label, kind: f.kind }))
      .filter((f) => {
        const v = snap.values[f.id];
        return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
      })
      .map((f) => ({ label: f.label, kind: f.kind, value: snap.values[f.id] }));

    if (entries.length > 0) {
      apiFetch("/api/applicant/autofill/commit/", {
        method: "POST",
        body: JSON.stringify({ entries }),
      }).catch(() => {
        // best-effort — memory commit failures are silent
      });
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
