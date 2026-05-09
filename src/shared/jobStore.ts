// Persistent state for the active job (capture → optimize → done lifecycle).
// Lives in chrome.storage.local so it survives popup close and SW idle.

import type { ExtractedListing, Optimization } from "./types";

export const JOB_STORAGE_KEY = "scout.activeJob";

export type OptimizationSummary = Pick<
  Optimization,
  "id" | "status" | "errorMessage" | "changeSummary" | "recruiterReview" | "completedAt"
>;

export type ActiveJob =
  | {
      kind: "capturing";
      tabId: number;
      url: string;
      hostname: string;
      title: string;
      startedAt: string;
    }
  | { kind: "captured"; listing: ExtractedListing; hostname: string; capturedAt: string }
  | {
      kind: "optimizing";
      listing: ExtractedListing;
      hostname: string;
      optimizationId: number;
      startedAt: string;
    }
  | {
      kind: "completed";
      listing: ExtractedListing;
      hostname: string;
      optimizationId: number;
      summary: OptimizationSummary;
      completedAt: string;
    }
  | {
      kind: "failed";
      phase: "capture" | "optimize";
      message: string;
      listing?: ExtractedListing;
      hostname?: string;
      optimizationId?: number;
      failedAt: string;
    };

export async function loadJob(): Promise<ActiveJob | null> {
  const out = await chrome.storage.local.get(JOB_STORAGE_KEY);
  const v = out[JOB_STORAGE_KEY];
  if (!v || typeof v !== "object" || typeof (v as { kind?: unknown }).kind !== "string") {
    return null;
  }
  return v as ActiveJob;
}

export async function saveJob(job: ActiveJob): Promise<void> {
  await chrome.storage.local.set({ [JOB_STORAGE_KEY]: job });
}

export async function clearJob(): Promise<void> {
  await chrome.storage.local.remove(JOB_STORAGE_KEY);
}
