import { useCallback, useEffect, useState } from "react";
import { type ActiveJob, JOB_STORAGE_KEY, clearJob, loadJob } from "@/shared/jobStore";

export function useActiveJob(): {
  job: ActiveJob | null;
  loading: boolean;
  startCapture: (tabId: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  startOptimize: () => Promise<{ ok: true } | { ok: false; error: string }>;
  reset: () => Promise<void>;
} {
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const j = await loadJob();
      if (cancelled) return;
      setJob(j);
      setLoading(false);
    })();

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area !== "local" || !(JOB_STORAGE_KEY in changes)) return;
      const next = changes[JOB_STORAGE_KEY]?.newValue ?? null;
      setJob((next as ActiveJob | null) ?? null);
    };
    chrome.storage.onChanged.addListener(onChange);

    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  const startCapture = useCallback(async (tabId: number) => {
    const r = (await chrome.runtime.sendMessage({ kind: "JOB_START_CAPTURE", tabId })) as
      | { ok: true }
      | { ok: false; error: string }
      | undefined;
    return r ?? { ok: false, error: "background not responding" };
  }, []);

  const startOptimize = useCallback(async () => {
    const r = (await chrome.runtime.sendMessage({ kind: "JOB_START_OPTIMIZE" })) as
      | { ok: true }
      | { ok: false; error: string }
      | undefined;
    return r ?? { ok: false, error: "background not responding" };
  }, []);

  const reset = useCallback(async () => {
    await chrome.runtime.sendMessage({ kind: "JOB_RESET" });
    await clearJob();
  }, []);

  return { job, loading, startCapture, startOptimize, reset };
}
