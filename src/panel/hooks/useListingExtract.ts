import { useCallback, useState } from "react";
import type { ExtractedListing } from "@/shared/types";
import { extractListing, snapshotActiveTab, type PageSnapshot } from "./listingExtract";

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
      const listing = await extractListing(snapshot);
      setState({ kind: "done", listing });
    } catch (err) {
      const message = err instanceof Error ? err.message : "extraction failed";
      setState({ kind: "error", message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, extract, reset };
}
