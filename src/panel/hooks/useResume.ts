import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/shared/api";

interface ResumePayload {
  id: number;
  source_filename: string;
  source_kind: "docx" | "pdf" | "markdown";
  updated_at: string;
}

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; resume: ResumePayload }
  | { kind: "error"; message: string };

export function useResume(): { state: State; refresh: () => Promise<void> } {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = async () => {
    setState({ kind: "loading" });
    try {
      const r = await apiFetch<ResumePayload>("/api/resume/resume/");
      setState({ kind: "ready", resume: r });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState({ kind: "missing" });
        return;
      }
      const message = err instanceof Error ? err.message : "failed to load resume";
      setState({ kind: "error", message });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return { state, refresh: load };
}
