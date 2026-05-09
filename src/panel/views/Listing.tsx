import { useEffect, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import type { ExtractedListing } from "@/shared/types";
import { useActiveTab } from "../hooks/useActiveTab";
import { useListingExtract } from "../hooks/useListingExtract";
import { AccentCard } from "../styled";

interface Props {
  onOptimize: (listing: ExtractedListing) => void;
}

export function Listing({ onOptimize }: Props) {
  const { tab } = useActiveTab();
  const { state, extract, reset } = useListingExtract();

  // Reset extraction whenever the active tab changes — the panel's tabId is
  // sticky, so the previous extraction is no longer about the current page.
  useEffect(() => {
    reset();
  }, [tab?.tabId, reset]);

  const tabHostname = useMemo(() => {
    if (!tab?.url) return "";
    try {
      return new URL(tab.url).hostname;
    } catch {
      return "";
    }
  }, [tab?.url]);

  if (!tab) {
    return (
      <Stack spacing={2}>
        <Alert severity="info">Open a tab with a job listing.</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <AccentCard>
        <Typography variant="overline" color="text.secondary">
          Current page
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
          {tab.title || tabHostname || tab.url}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
          {tab.url}
        </Typography>

        <Box sx={{ mt: 2 }}>
          {state.kind === "idle" && (
            <Button variant="contained" onClick={() => void extract(tab.tabId)} fullWidth>
              Capture this listing
            </Button>
          )}
          {(state.kind === "scraping" || state.kind === "extracting") && (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {state.kind === "scraping" ? "Reading page..." : "Parsing listing..."}
              </Typography>
            </Stack>
          )}
          {state.kind === "error" && (
            <Stack spacing={1}>
              <Alert severity="error">{state.message}</Alert>
              <Button variant="outlined" onClick={() => void extract(tab.tabId)}>
                Try again
              </Button>
            </Stack>
          )}
        </Box>
      </AccentCard>

      {state.kind === "done" && (
        <ParsedListingCard
          listing={state.listing}
          onOptimize={() => onOptimize(state.listing)}
          onRecapture={() => void extract(tab.tabId)}
        />
      )}
    </Stack>
  );
}

function ParsedListingCard({
  listing,
  onOptimize,
  onRecapture,
}: {
  listing: ExtractedListing;
  onOptimize: () => void;
  onRecapture: () => void;
}) {
  const descHtml = useMemo(() => {
    const raw = listing.description_markdown || "";
    if (!raw.trim()) return "";
    return DOMPurify.sanitize(marked.parse(raw, { async: false }) as string);
  }, [listing.description_markdown]);

  const lowConfidence = listing.confidence < 0.5;

  return (
    <AccentCard>
      <Stack spacing={1}>
        {lowConfidence && (
          <Alert severity="warning">
            Scout isn&apos;t sure this page is a single job listing
            (confidence {Math.round(listing.confidence * 100)}%).
            Optimize anyway, or open the actual job posting and recapture.
          </Alert>
        )}
        <Typography variant="overline" color="text.secondary">
          Parsed listing
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {listing.title || "(no title)"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {listing.company || "—"}
          {listing.location ? ` · ${listing.location}` : ""}
        </Typography>

        <Divider sx={{ my: 1 }} />

        {descHtml ? (
          <Box
            sx={{
              "& p": { margin: "6px 0" },
              "& ol, & ul": { paddingLeft: 20, margin: "6px 0" },
              "& li": { marginBottom: 2 },
              fontSize: 12.5,
              lineHeight: 1.55,
              maxHeight: 240,
              overflowY: "auto",
              border: (t) => `1px solid ${t.palette.divider}`,
              padding: 1,
            }}
            dangerouslySetInnerHTML={{ __html: descHtml }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No description extracted.
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button variant="contained" onClick={onOptimize} fullWidth>
            Optimize my resume
          </Button>
          <Button variant="outlined" onClick={onRecapture}>
            Recapture
          </Button>
        </Stack>
      </Stack>
    </AccentCard>
  );
}
