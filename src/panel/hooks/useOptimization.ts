import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, apiFetchBlob } from "@/shared/api";
import type { Optimization } from "@/shared/types";

// camelCase the snake_case payload so the rest of the panel stays in JS-style.
function camelize<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) return input.map((v) => camelize(v)) as unknown as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      const ck = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      out[ck] = camelize(v);
    }
    return out as T;
  }
  return input as T;
}

interface CreateRequest {
  jobContextTitle: string;
  jobContextText: string;
}

type State =
  | { kind: "idle" }
  | { kind: "running"; opt: Optimization }
  | { kind: "done"; opt: Optimization }
  | { kind: "error"; message: string };

export function useOptimization(): {
  state: State;
  create: (req: CreateRequest) => Promise<void>;
  download: (format: "pdf" | "docx") => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<State>({ kind: "idle" });
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current != null) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const fetchOpt = async (id: number): Promise<Optimization> => {
    const raw = await apiFetch<unknown>(`/api/resume/optimizations/${id}/`);
    return camelize<Optimization>(raw);
  };

  const poll = useCallback((id: number) => {
    const tick = async () => {
      try {
        const opt = await fetchOpt(id);
        if (opt.status === "running") {
          setState({ kind: "running", opt });
          pollRef.current = window.setTimeout(tick, 2000);
        } else if (opt.status === "succeeded") {
          setState({ kind: "done", opt });
        } else {
          setState({
            kind: "error",
            message: opt.errorMessage || "optimization failed",
          });
        }
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "polling failed",
        });
      }
    };
    void tick();
  }, []);

  const create = useCallback(
    async (req: CreateRequest) => {
      setState({ kind: "running", opt: { id: -1 } as Optimization });
      try {
        const raw = await apiFetch<unknown>("/api/resume/optimizations/", {
          method: "POST",
          body: JSON.stringify({
            job_context_kind: "pasted",
            job_context_title: req.jobContextTitle,
            job_context_text: req.jobContextText,
          }),
        });
        const opt = camelize<Optimization>(raw);
        setState({ kind: "running", opt });
        poll(opt.id);
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "create failed",
        });
      }
    },
    [poll],
  );

  const download = useCallback(
    async (format: "pdf" | "docx") => {
      if (state.kind !== "done") return;
      const { blob, filename } = await apiFetchBlob(
        `/api/resume/optimizations/${state.opt.id}/download/?file_format=${format}`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `resume.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [state],
  );

  const reset = useCallback(() => {
    if (pollRef.current != null) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setState({ kind: "idle" });
  }, []);

  return { state, create, download, reset };
}
