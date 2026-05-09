import { useCallback, useState } from "react";
import { apiFetch } from "@/shared/api";
import type { ExtractedListing } from "@/shared/types";

type State =
  | { kind: "idle" }
  | { kind: "scraping" }
  | { kind: "extracting" }
  | { kind: "done"; listing: ExtractedListing }
  | { kind: "error"; message: string };

interface PageSnapshot {
  url: string;
  title: string;
  text: string;
}

const MAX_TEXT_CHARS = 30_000;

// Runs inside the target page (not the extension). Cannot reference module
// scope — chrome.scripting serializes it.
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

export function useListingExtract(): {
  state: State;
  extract: (tabId: number) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<State>({ kind: "idle" });

  const extract = useCallback(async (tabId: number) => {
    setState({ kind: "scraping" });
    let snapshot: PageSnapshot;
    try {
      snapshot = await snapshotActiveTab(tabId);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "page snapshot failed";
      setState({
        kind: "error",
        message: `${detail}. Pages like chrome:// and the Web Store don't allow extension scripts.`,
      });
      return;
    }

    setState({ kind: "extracting" });
    try {
      const listing = await apiFetch<ExtractedListing>("/api/discover/extract-listing/", {
        method: "POST",
        body: JSON.stringify({
          url: snapshot.url,
          page_title: snapshot.title,
          page_text: snapshot.text,
        }),
      });
      setState({ kind: "done", listing });
    } catch (err) {
      const message = err instanceof Error ? err.message : "extraction failed";
      setState({ kind: "error", message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, extract, reset };
}
