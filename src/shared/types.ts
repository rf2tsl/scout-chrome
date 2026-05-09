// Types shared across panel, background, and content scripts.

export type AuthState =
  | { kind: "unknown" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; token: string; expiresAt: string };

// Backend payloads ----------------------------------------------------------

export interface ExtractedListing {
  title: string;
  company: string;
  location: string;
  description_markdown: string;
  apply_url: string;
  confidence: number;
}

export type OptimizationStatus = "running" | "succeeded" | "failed";

export interface Optimization {
  id: number;
  jobContextKind: "saved_job" | "pasted" | "described";
  jobContextTitle: string;
  status: OptimizationStatus;
  errorMessage: string;
  createdAt: string;
  completedAt: string | null;
  jobContextText: string;
  originalMarkdown: string;
  optimizedMarkdown: string;
  changeSummary: string[];
  recruiterReview: string;
}

// Active-tab snapshot the panel uses to show "what page are we on" --------

export interface ActiveTabInfo {
  tabId: number;
  url: string;
  title: string;
}
