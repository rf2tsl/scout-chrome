// Typed protocol for chrome.runtime.sendMessage between panel ↔ background ↔ content.

import type { AuthState, FieldSpec, FieldValue, LockedDraft } from "./types";

// Panel ↔ Background --------------------------------------------------------

export type GetAuthStateRequest = { kind: "GET_AUTH_STATE" };
export type GetAuthStateResponse = { ok: true; state: AuthState };

export type SignOutRequest = { kind: "SIGN_OUT" };
export type SignOutResponse = { ok: true };

export type OpenSignInRequest = { kind: "OPEN_SIGN_IN" };
export type OpenSignInResponse = { ok: true };

export type GetActiveTabRequest = { kind: "GET_ACTIVE_TAB" };
export type GetActiveTabResponse = {
  ok: true;
  tabId: number;
  url: string;
  title: string;
};

// Panel/Background → Content (via chrome.tabs.sendMessage) -----------------

export type ExtractPageRequest = { kind: "EXTRACT_PAGE" };
export type ExtractPageResponse = {
  ok: true;
  url: string;
  title: string;
  text: string;
};

// Job lifecycle ------------------------------------------------------------

export type JobStartOptimizeRequest = {
  kind: "JOB_START_OPTIMIZE";
};
export type JobStartOptimizeResponse =
  | { ok: true }
  | { ok: false; error: string };

export type JobResetRequest = { kind: "JOB_RESET" };
export type JobResetResponse = { ok: true };

// Panel → Background — request injection of the autofill content script.
export type InjectAutofillRequest = { kind: "INJECT_AUTOFILL"; tabId: number };
export type InjectAutofillResponse =
  | { ok: true }
  | { ok: false; error: string };

// Panel → Content (autofill module).
export type ScanFormRequest = { kind: "SCAN_FORM" };
export type ScanFormResponse =
  | { ok: true; fields: FieldSpec[] }
  | { ok: false; error: string };

export type FillFormRequest = {
  kind: "FILL_FORM";
  values: Record<string, FieldValue>;
};
export type FillFormResponse =
  | { ok: true; filled: number; failed: string[] }
  | { ok: false; error: string };

// Banner → Background ──────────────────────────────────────────────────────

export type FetchLockedDraftRequest = {
  kind: "FETCH_LOCKED_DRAFT";
  boardSlug: string;
  atsExternalId: string;
};
export type FetchLockedDraftResponse =
  | { ok: true; draft: LockedDraft }
  | { ok: true; draft: null }
  | { ok: false; error: string };

// Banner/Panel → Content (autofill module).
export type FillFromValuesRequest = {
  kind: "FILL_FROM_VALUES";
  values: Record<string, FieldValue>;
};
export type FillFromValuesResponse =
  | { ok: true; filled: number; failed: string[] }
  | { ok: false; error: string };

// Content script → Background → injected autofill (round-trip).
export type FillFromValuesViaTabRequest = {
  kind: "FILL_FROM_VALUES_VIA_TAB";
  values: Record<string, FieldValue>;
};
export type FillFromValuesViaTabResponse = FillFromValuesResponse;

// Background → Panel broadcast (via chrome.runtime.sendMessage to all clients)

export type AuthChangedEvent = { kind: "AUTH_CHANGED"; state: AuthState };

// Union types for senders/receivers ---------------------------------------

export type PanelToBackground =
  | GetAuthStateRequest
  | SignOutRequest
  | OpenSignInRequest
  | GetActiveTabRequest
  | InjectAutofillRequest
  | FetchLockedDraftRequest;

export type BackgroundToPanel = AuthChangedEvent;

export type AnyToContent = ExtractPageRequest;

export type AnyToContentAutofill =
  | ScanFormRequest
  | FillFormRequest
  | FillFromValuesRequest;
