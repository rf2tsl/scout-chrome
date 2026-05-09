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

// LinkedIn Profile Suggestions ----------------------------------------------

export type ChecklistStatus = "pass" | "fail" | "indeterminate";

export interface ChecklistItem {
  section: string;
  id: string;
  label: string;
  status: ChecklistStatus;
  note: string;
}

export interface SectionSuggestion {
  text: string;
  rationale: string;
}

export interface BulletSuggestion {
  text: string;
  rationale: string;
}

export interface ExperienceRoleSuggestion {
  company: string;
  role: string;
  bullets: BulletSuggestion[];
}

export interface FeaturedItemSuggestion {
  title: string;
  suggestion: string;
}

export interface ProfileSuggestionsBundle {
  headline: SectionSuggestion;
  about: SectionSuggestion;
  experience: ExperienceRoleSuggestion[];
  skills: SectionSuggestion;
  featured: { items: FeaturedItemSuggestion[]; rationale: string };
}

export type ProfileSuggestionStatus = "pending" | "done" | "error";

export interface ProfileSuggestion {
  id: number;
  profile_url: string;
  target_role: string;
  parsed_sections: Record<string, unknown>;
  suggestions: ProfileSuggestionsBundle;
  checklist_results: ChecklistItem[];
  status: ProfileSuggestionStatus;
  error_message: string;
  model_version: string;
  created_at: string;
  updated_at: string;
}
