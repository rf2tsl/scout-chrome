import type { ApplicantProfile } from "@/shared/types";

export type ProfileFieldKey = keyof ApplicantProfile;

export interface ScanArgs {
  optimizationId: number;
  tabId: number;
}
