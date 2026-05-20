import { useEffect, useState } from "react";
import type { GetActiveTabResponse } from "@/shared/messages";
import type { ActiveTabInfo } from "@/shared/types";

export function useActiveTab(): {
  tab: ActiveTabInfo | null;
  refresh: () => Promise<void>;
} {
  const [tab, setTab] = useState<ActiveTabInfo | null>(null);

  const load = async () => {
    const r = (await chrome.runtime.sendMessage({ kind: "GET_ACTIVE_TAB" })) as
      | GetActiveTabResponse
      | { ok: false }
      | undefined;
    if (!r || !r.ok) {
      setTab(null);
      return;
    }
    setTab({ tabId: r.tabId, url: r.url, title: r.title });
  };

  useEffect(() => {
    void load();
    const onActivated = () => void load();
    const onUpdated = (
      _id: number,
      change: chrome.tabs.TabChangeInfo,
      _tab: chrome.tabs.Tab,
    ) => {
      if (change.url || change.title || change.status === "complete") void load();
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return { tab, refresh: load };
}
