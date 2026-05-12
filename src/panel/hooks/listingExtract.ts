import { apiFetch } from "@/shared/api";
import type { ExtractedListing } from "@/shared/types";

export interface PageSnapshot {
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

export async function snapshotActiveTab(tabId: number): Promise<PageSnapshot> {
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

export async function extractListing(snapshot: PageSnapshot): Promise<ExtractedListing> {
  return apiFetch<ExtractedListing>("/api/discover/extract-listing/", {
    method: "POST",
    body: JSON.stringify({
      url: snapshot.url,
      page_title: snapshot.title,
      page_text: snapshot.text,
    }),
  });
}
