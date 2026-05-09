// scout-chrome/src/panel/hooks/useOptimizationHistory.ts
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/shared/api";
import { toUserMessage } from "@/shared/userError";
import type { OptimizationListItem } from "@/shared/types";

export type HistoryState =
  | { kind: "loading" }
  | { kind: "ready"; items: OptimizationListItem[] }
  | { kind: "error"; message: string };

export function useOptimizationHistory(): {
  state: HistoryState;
  refetch: () => Promise<void>;
  remove: (id: number) => Promise<void>;
} {
  const [state, setState] = useState<HistoryState>({ kind: "loading" });

  const refetch = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const items = await apiFetch<OptimizationListItem[]>(
        "/api/resume/optimizations/",
      );
      setState({ kind: "ready", items });
    } catch (err) {
      setState({ kind: "error", message: toUserMessage(err) });
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const remove = useCallback(async (id: number) => {
    await apiFetch(`/api/resume/optimizations/${id}/`, { method: "DELETE" });
    setState((prev) => {
      if (prev.kind !== "ready") return prev;
      return { kind: "ready", items: prev.items.filter((x) => x.id !== id) };
    });
  }, []);

  return { state, refetch, remove };
}
