import { useCallback, useState } from "react";
import { apiFetch } from "@/shared/api";
import type { ExtractPageResponse } from "@/shared/messages";
import type { ExtractedListing } from "@/shared/types";

type State =
  | { kind: "idle" }
  | { kind: "scraping" }
  | { kind: "extracting" }
  | { kind: "done"; listing: ExtractedListing }
  | { kind: "error"; message: string };

export function useListingExtract(): {
  state: State;
  extract: (tabId: number) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<State>({ kind: "idle" });

  const extract = useCallback(async (tabId: number) => {
    setState({ kind: "scraping" });
    let scraped: ExtractPageResponse;
    try {
      const r = (await chrome.tabs.sendMessage(tabId, { kind: "EXTRACT_PAGE" })) as
        | ExtractPageResponse
        | undefined;
      if (!r?.ok) throw new Error("page-text scrape failed");
      scraped = r;
    } catch (err) {
      const message =
        err instanceof Error
          ? `${err.message}. The page may not allow content scripts (e.g. chrome:// or store pages).`
          : "page-text scrape failed";
      setState({ kind: "error", message });
      return;
    }

    setState({ kind: "extracting" });
    try {
      const listing = await apiFetch<ExtractedListing>("/api/discover/extract-listing/", {
        method: "POST",
        body: JSON.stringify({
          url: scraped.url,
          page_title: scraped.title,
          page_text: scraped.text,
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
