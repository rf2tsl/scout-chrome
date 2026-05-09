// Typed protocol for chrome.runtime.sendMessage between panel ↔ background ↔ content.

import type { AuthState } from "./types";

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

// Background → Panel broadcast (via chrome.runtime.sendMessage to all clients)

export type AuthChangedEvent = { kind: "AUTH_CHANGED"; state: AuthState };

// Union types for senders/receivers ---------------------------------------

export type PanelToBackground =
  | GetAuthStateRequest
  | SignOutRequest
  | OpenSignInRequest
  | GetActiveTabRequest;

export type BackgroundToPanel = AuthChangedEvent;

export type AnyToContent = ExtractPageRequest;
