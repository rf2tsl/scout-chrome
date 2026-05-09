// scout-chrome/src/panel/hooks/usePanelTab.ts
import { useCallback, useEffect, useState } from "react";
import type { PanelTab } from "@/shared/types";

const KEY = "scout:panel:tab";
const VALID: PanelTab[] = ["home", "linkedin", "resumes"];

function isPanelTab(v: unknown): v is PanelTab {
  return typeof v === "string" && (VALID as string[]).includes(v);
}

export function usePanelTab(): {
  tab: PanelTab;
  setTab: (t: PanelTab) => void;
  ready: boolean;
} {
  const [tab, setTabState] = useState<PanelTab>("home");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void chrome.storage.local.get([KEY]).then((data) => {
      const v = data[KEY];
      if (isPanelTab(v)) setTabState(v);
      setReady(true);
    });
  }, []);

  const setTab = useCallback((t: PanelTab) => {
    setTabState(t);
    void chrome.storage.local.set({ [KEY]: t });
  }, []);

  return { tab, setTab, ready };
}
