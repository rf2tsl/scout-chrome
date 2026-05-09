// scout-chrome/src/panel/hooks/useLinkedinHistory.ts
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/shared/api";
import type { ProfileSuggestionListItem } from "@/shared/types";

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProfileSuggestionListItem[];
}

export type HistoryState =
  | { kind: "loading" }
  | { kind: "ready"; items: ProfileSuggestionListItem[] }
  | { kind: "error"; message: string };

export function useLinkedinHistory(): {
  state: HistoryState;
  refetch: () => Promise<void>;
  remove: (id: number) => Promise<void>;
} {
  const [state, setState] = useState<HistoryState>({ kind: "loading" });

  const refetch = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const r = await apiFetch<PaginatedResponse>(
        "/api/linkedin/profile-suggestions/?limit=50",
      );
      setState({ kind: "ready", items: r.results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "failed to load";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const remove = useCallback(async (id: number) => {
    await apiFetch(`/api/linkedin/profile-suggestions/${id}/`, { method: "DELETE" });
    setState((prev) => {
      if (prev.kind !== "ready") return prev;
      return { kind: "ready", items: prev.items.filter((x) => x.id !== id) };
    });
  }, []);

  return { state, refetch, remove };
}
