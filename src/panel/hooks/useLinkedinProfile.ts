import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/shared/api";
import { toUserMessage } from "@/shared/userError";
import type { ProfileSuggestion } from "@/shared/types";

const TARGET_ROLE_KEY = "scout:linkedin:target-role";
const MAX_TEXT_CHARS = 30_000;

interface PageSnapshot {
  url: string;
  title: string;
  text: string;
}

// Runs in the target page (chrome.scripting serializes it). No closures.
function snapshotPage(maxChars: number): PageSnapshot {
  return {
    url: location.href,
    title: document.title,
    text: (document.body?.innerText || "").slice(0, maxChars),
  };
}

async function snapshotActiveTab(tabId: number): Promise<PageSnapshot> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: snapshotPage,
    args: [MAX_TEXT_CHARS],
  });
  if (!result || typeof result.result !== "object" || result.result == null) {
    throw new Error("page snapshot returned no result");
  }
  return result.result as PageSnapshot;
}

export type LinkedinState =
  | { kind: "idle" }
  | { kind: "loading-cache" }
  | { kind: "scraping" }
  | { kind: "analyzing" }
  | { kind: "done"; suggestion: ProfileSuggestion }
  | { kind: "error"; message: string };

export function useLinkedinProfile(profileUrl: string): {
  state: LinkedinState;
  targetRole: string;
  setTargetRole: (value: string) => void;
  scan: (tabId: number) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<LinkedinState>({ kind: "idle" });
  const [targetRole, setTargetRoleState] = useState<string>("");

  // Load persisted target role on mount.
  useEffect(() => {
    void chrome.storage.local.get([TARGET_ROLE_KEY]).then((data) => {
      const v = data[TARGET_ROLE_KEY];
      if (typeof v === "string") setTargetRoleState(v);
    });
  }, []);

  const setTargetRole = useCallback((value: string) => {
    setTargetRoleState(value);
    void chrome.storage.local.set({ [TARGET_ROLE_KEY]: value });
  }, []);

  // Hydrate the most recent suggestion for this profile URL.
  useEffect(() => {
    if (!profileUrl) return;
    let cancelled = false;
    setState({ kind: "loading-cache" });
    void apiFetch<ProfileSuggestion>(
      `/api/linkedin/profile-suggestions/?profile_url=${encodeURIComponent(profileUrl)}`,
    )
      .then((suggestion) => {
        if (cancelled) return;
        setState({ kind: "done", suggestion });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: "idle" });
          return;
        }
        setState({ kind: "error", message: toUserMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [profileUrl]);

  const scan = useCallback(
    async (tabId: number) => {
      const role = targetRole.trim();
      if (!role) {
        setState({ kind: "error", message: "Enter a target role first." });
        return;
      }
      setState({ kind: "scraping" });
      let snapshot: PageSnapshot;
      try {
        snapshot = await snapshotActiveTab(tabId);
      } catch {
        setState({
          kind: "error",
          message: "Couldn't read the LinkedIn page. Reload it and try again.",
        });
        return;
      }

      setState({ kind: "analyzing" });
      try {
        const suggestion = await apiFetch<ProfileSuggestion>(
          "/api/linkedin/profile-suggestions/",
          {
            method: "POST",
            body: JSON.stringify({
              profile_url: profileUrl,
              target_role: role,
              snapshot: {
                url: snapshot.url,
                title: snapshot.title,
                text: snapshot.text,
              },
            }),
          },
        );
        setState({ kind: "done", suggestion });
      } catch (err) {
        setState({ kind: "error", message: toUserMessage(err) });
      }
    },
    [profileUrl, targetRole],
  );

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, targetRole, setTargetRole, scan, reset };
}
