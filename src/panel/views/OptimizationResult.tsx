import { useCallback, useMemo } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { apiFetchBlob } from "@/shared/api";
import type { ActiveJob } from "@/shared/jobStore";
import { PopupShell } from "../components/PopupShell";
import { DetectedJobCard } from "../components/DetectedJobCard";
import { SectionLabel } from "../components/SectionLabel";
import { ACCENT, BORDER, DIM, FAINT, MUTED, SURFACE, TEXT } from "../theme";
import { Card, PaddedCard, SpinnerRing } from "../styled";

interface Props {
  job: Extract<ActiveJob, { kind: "optimizing" | "completed" | "failed" }>;
  onBack: () => void;
}

export function OptimizationResult({ job, onBack }: Props) {
  const subtitle = [job.listing?.company, job.listing?.location].filter(Boolean).join(" · ");

  const download = useCallback(
    async (format: "pdf" | "docx") => {
      try {
        const { blob, filename } = await apiFetchBlob(
          `/api/resume/optimizations/${job.optimizationId}/download/?file_format=${format}`,
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `resume.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [job.optimizationId],
  );

  const footer = (() => {
    if (job.kind === "optimizing") {
      return (
        <Button
          variant="contained"
          fullWidth
          disabled
          sx={{
            background: "#1f2937",
            color: FAINT,
            "&.Mui-disabled": { background: "#1f2937", color: FAINT },
          }}
        >
          Analyzing… (you can close this popup)
        </Button>
      );
    }
    if (job.kind === "failed") {
      return (
        <Button variant="outlined" fullWidth onClick={onBack}>
          Try a different listing
        </Button>
      );
    }
    return (
      <Stack direction="row" spacing={0.75}>
        <Button
          variant="contained"
          onClick={() => void download("pdf")}
          sx={{
            flex: 1,
            background: ACCENT,
            color: "#0a0e14",
            fontSize: 12,
            "&:hover": { background: ACCENT, opacity: 0.9 },
          }}
        >
          ↓ PDF
        </Button>
        <Button
          onClick={() => void download("docx")}
          sx={{
            padding: "9px 12px",
            border: `1px solid ${BORDER}`,
            color: DIM,
            fontSize: 12,
          }}
        >
          DOCX
        </Button>
        <Button
          onClick={onBack}
          sx={{
            padding: "9px 12px",
            border: `1px solid ${BORDER}`,
            color: DIM,
            fontSize: 12,
          }}
        >
          New
        </Button>
      </Stack>
    );
  })();

  return (
    <PopupShell footer={footer}>
      <DetectedJobCard
        title={job.listing?.title || ""}
        subtitle={subtitle}
        source={job.hostname}
      />

      {job.kind === "optimizing" && (
        <PaddedCard
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            minHeight: 260,
          }}
        >
          <SpinnerRing>
            <Box className="ring-bg" />
            <Box className="ring-fg" />
            <Box className="ring-glyph">✦</Box>
          </SpinnerRing>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 500, mb: 0.5 }}>
              Optimizing{job.listing?.company ? ` for ${job.listing?.company}` : ""}
            </Typography>
            <Typography sx={{ fontSize: 11, color: MUTED }}>
              You can close this popup — we&apos;ll keep working in the background.
            </Typography>
          </Box>
        </PaddedCard>
      )}

      {job.kind === "failed" && (
        <Alert severity="error" sx={{ background: SURFACE }}>
          {job.message}
        </Alert>
      )}

      {job.kind === "completed" && (
        <DoneView
          changeSummary={job.summary.changeSummary}
          recruiterReview={job.summary.recruiterReview}
        />
      )}
    </PopupShell>
  );
}

function DoneView({
  changeSummary,
  recruiterReview,
}: {
  changeSummary: string[];
  recruiterReview: string;
}) {
  const reviewHtml = useMemo(() => {
    const raw = recruiterReview || "";
    if (!raw.trim()) return "";
    return DOMPurify.sanitize(marked.parse(raw, { async: false }) as string);
  }, [recruiterReview]);

  return (
    <>
      {changeSummary.length > 0 && (
        <>
          <SectionLabel hint={`${changeSummary.length} edits`}>What changed</SectionLabel>
          <Card>
            <Stack spacing={0.75}>
              {changeSummary.map((line, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ color: ACCENT, fontSize: 11, lineHeight: 1.55, flexShrink: 0 }}>+</Box>
                  <Typography sx={{ fontSize: 11, color: DIM, lineHeight: 1.55 }}>
                    {line}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        </>
      )}

      {reviewHtml && (
        <>
          <SectionLabel>10-second recruiter review</SectionLabel>
          <Card>
            <Box
              sx={{
                fontSize: 11,
                lineHeight: 1.55,
                color: DIM,
                "& p": { margin: "5px 0" },
                "& ol, & ul": { paddingLeft: 2.5, margin: "5px 0" },
                "& strong": { color: TEXT, fontWeight: 600 },
                "& em": { color: ACCENT, fontStyle: "normal" },
              }}
              dangerouslySetInnerHTML={{ __html: reviewHtml }}
            />
          </Card>
        </>
      )}

      {!changeSummary.length && !reviewHtml && (
        <Card>
          <Typography sx={{ fontSize: 12, color: FAINT, textAlign: "center", py: 2 }}>
            No edits returned. Try a different listing.
          </Typography>
        </Card>
      )}
    </>
  );
}
