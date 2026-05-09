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
import { useOptimization } from "../hooks/useOptimization";
import { AccentCard } from "../styled";

interface Props {
  listing: ExtractedListing;
  onBack: () => void;
}

export function OptimizationResult({ listing, onBack }: Props) {
  const { state, create, download, reset } = useOptimization();

  // Kick off the run as soon as the view mounts.
  useEffect(() => {
    const title = listing.company
      ? `${listing.title || "Role"} at ${listing.company}`
      : listing.title || "Pasted listing";
    const text = [
      listing.title && `Title: ${listing.title}`,
      listing.company && `Company: ${listing.company}`,
      listing.location && `Location: ${listing.location}`,
      "",
      listing.description_markdown,
    ]
      .filter(Boolean)
      .join("\n");
    void create({ jobContextTitle: title, jobContextText: text });
    return () => reset();
    // intentionally only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="overline" color="text.secondary">
          Optimization
        </Typography>
        <Button size="small" onClick={onBack}>
          ← Back
        </Button>
      </Stack>

      {state.kind === "running" && (
        <AccentCard>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Tailoring your resume to this listing...
            </Typography>
          </Stack>
        </AccentCard>
      )}

      {state.kind === "error" && (
        <Alert severity="error">
          {state.message}
          <Box sx={{ mt: 1 }}>
            <Button size="small" variant="outlined" onClick={onBack}>
              Go back
            </Button>
          </Box>
        </Alert>
      )}

      {state.kind === "done" && (
        <DoneView
          opt={state.opt}
          onDownloadPdf={() => void download("pdf")}
          onDownloadDocx={() => void download("docx")}
        />
      )}
    </Stack>
  );
}

function DoneView({
  opt,
  onDownloadPdf,
  onDownloadDocx,
}: {
  opt: { changeSummary: string[]; recruiterReview: string };
  onDownloadPdf: () => void;
  onDownloadDocx: () => void;
}) {
  const reviewHtml = useMemo(() => {
    const raw = opt.recruiterReview || "";
    if (!raw.trim()) return "";
    return DOMPurify.sanitize(marked.parse(raw, { async: false }) as string);
  }, [opt.recruiterReview]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={onDownloadPdf} fullWidth>
          Download PDF
        </Button>
        <Button variant="outlined" onClick={onDownloadDocx} fullWidth>
          DOCX
        </Button>
      </Stack>

      {opt.changeSummary.length > 0 && (
        <AccentCard>
          <Typography variant="overline" color="text.secondary">
            What changed
          </Typography>
          <Box component="ul" sx={{ paddingLeft: 2.5, margin: 0, mt: 1 }}>
            {opt.changeSummary.map((line, i) => (
              <li key={i}>
                <Typography variant="body2">{line}</Typography>
              </li>
            ))}
          </Box>
        </AccentCard>
      )}

      {reviewHtml && (
        <AccentCard>
          <Typography variant="overline" color="text.secondary">
            10-second recruiter review
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box
            sx={{
              "& p": { margin: "6px 0" },
              "& ol, & ul": { paddingLeft: 2.5, margin: "6px 0" },
              fontSize: 13,
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: reviewHtml }}
          />
        </AccentCard>
      )}
    </Stack>
  );
}
