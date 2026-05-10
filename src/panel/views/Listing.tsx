import { useMemo } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { WEB_APP_BASE_URL } from "@/shared/config";
import type { ActiveJob } from "@/shared/jobStore";
import { PopupShell } from "../components/PopupShell";
import { DetectedJobCard } from "../components/DetectedJobCard";
import { SectionLabel } from "../components/SectionLabel";
import { useActiveTab } from "../hooks/useActiveTab";
import { useResume } from "../hooks/useResume";
import { ACCENT, BORDER_HI, DIM, FAINT, MUTED, SURFACE, TEXT } from "../theme";
import { Card } from "../styled";

interface Props {
  job: ActiveJob | null;
  reset: () => Promise<void>;
  startCapture: (tabId: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  startOptimize: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onOpenAutofill: () => void;
}

export function Listing({ job, reset, startCapture, startOptimize, onOpenAutofill }: Props) {
  const { tab } = useActiveTab();
  const { state: resumeState } = useResume();

  const tabHostname = useMemo(() => {
    if (!tab?.url) return "";
    try {
      return new URL(tab.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }, [tab?.url]);

  // Job categorization for this view (capture/idle stages only).
  const captured = job && job.kind === "captured" ? job : null;
  const capturing = job && job.kind === "capturing" ? job : null;
  const captureFailed =
    job && job.kind === "failed" && job.phase === "capture" ? job : null;

  // ─── Footer ──────────────────────────────────────────────────────────

  const footer = (() => {
    if (resumeState.kind === "missing") {
      return (
        <Button
          variant="outlined"
          fullWidth
          onClick={() => window.open(`${WEB_APP_BASE_URL}/resume`, "_blank")}
          sx={{ borderColor: ACCENT, color: ACCENT }}
        >
          Set up your resume in Scout
        </Button>
      );
    }
    if (captured) {
      const lowConfidence = captured.listing.confidence < 0.5;
      return (
        <Stack direction="row" spacing={0.75}>
          <Button
            variant="contained"
            onClick={() => void startOptimize()}
            sx={{
              flex: 1,
              background: ACCENT,
              color: "#0a0e14",
              "&:hover": { background: ACCENT, opacity: 0.9 },
            }}
          >
            ✦ {lowConfidence ? "Optimize anyway" : "Optimize for this role"}
          </Button>
          <Button
            onClick={() => onOpenAutofill()}
            sx={{ padding: "9px 12px", border: `1px solid #1f2937`, color: DIM, fontSize: 12 }}
          >
            Autofill
          </Button>
          <Button
            onClick={() => void reset()}
            sx={{ padding: "9px 12px", border: `1px solid #1f2937`, color: DIM, fontSize: 12 }}
          >
            Recapture
          </Button>
        </Stack>
      );
    }
    if (capturing) {
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
          Reading page… (you can close this popup)
        </Button>
      );
    }
    if (captureFailed) {
      return (
        <Stack direction="row" spacing={0.75}>
          <Button
            variant="contained"
            onClick={() => tab && void startCapture(tab.tabId)}
            disabled={!tab}
            sx={{
              flex: 1,
              background: ACCENT,
              color: "#0a0e14",
              "&:hover": { background: ACCENT, opacity: 0.9 },
            }}
          >
            Try again
          </Button>
          <Button
            onClick={() => void reset()}
            sx={{ padding: "9px 12px", border: `1px solid #1f2937`, color: DIM, fontSize: 12 }}
          >
            Dismiss
          </Button>
        </Stack>
      );
    }
    return (
      <Button
        variant="contained"
        fullWidth
        disabled={!tab}
        onClick={() => tab && void startCapture(tab.tabId)}
        sx={{
          background: ACCENT,
          color: "#0a0e14",
          "&:hover": { background: ACCENT, opacity: 0.9 },
        }}
      >
        ✦ Capture this listing
      </Button>
    );
  })();

  // ─── Body ─────────────────────────────────────────────────────────────

  return (
    <PopupShell footer={footer}>
      {!tab && !captured && !capturing && (
        <Alert severity="info" sx={{ background: SURFACE }}>
          Open a tab with a job listing.
        </Alert>
      )}

      {captured && (
        <DetectedJobCard
          title={captured.listing.title}
          subtitle={[captured.listing.company, captured.listing.location]
            .filter(Boolean)
            .join(" · ")}
          source={captured.hostname}
        />
      )}

      {capturing && (
        <ScanningCard hostname={capturing.hostname} title={capturing.title} />
      )}

      {captureFailed && (
        <Alert severity="error" sx={{ background: SURFACE }}>
          {captureFailed.message}
        </Alert>
      )}

      {!captured && !capturing && !captureFailed && tab && (
        <CurrentTabCard hostname={tabHostname} title={tab.title} />
      )}

      {resumeState.kind === "ready" && (
        <Button
          variant="outlined"
          fullWidth
          onClick={() => onOpenAutofill()}
          sx={{ borderColor: ACCENT, color: ACCENT, mt: 1 }}
        >
          Autofill this page
        </Button>
      )}

      {/* Resume status block */}
      <SectionLabel>Your Resume</SectionLabel>
      {resumeState.kind === "loading" && (
        <Card sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <CircularProgress size={14} sx={{ color: ACCENT }} />
          <Typography sx={{ fontSize: 12, color: DIM }}>Checking…</Typography>
        </Card>
      )}
      {resumeState.kind === "missing" && (
        <Box
          sx={{
            background: SURFACE,
            border: `1.5px dashed ${BORDER_HI}`,
            borderRadius: 2,
            padding: "20px 14px",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              margin: "0 auto 8px",
              borderRadius: "50%",
              background: `${ACCENT}11`,
              border: `1px solid ${ACCENT}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: ACCENT,
            }}
          >
            ↑
          </Box>
          <Typography sx={{ fontSize: 12, color: TEXT, mb: 0.5, fontWeight: 500 }}>
            No resume saved yet
          </Typography>
          <Typography sx={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
            Upload one in Scout to enable optimization.
          </Typography>
        </Box>
      )}
      {resumeState.kind === "ready" && <ResumePill resume={resumeState.resume} />}
      {resumeState.kind === "error" && (
        <Alert severity="error" sx={{ background: SURFACE }}>
          {resumeState.message}
        </Alert>
      )}

      <Box sx={{ mt: "auto" }} />
    </PopupShell>
  );
}

function CurrentTabCard({ hostname, title }: { hostname: string; title: string }) {
  return (
    <Card>
      <Stack spacing={0.5}>
        <Typography
          sx={{
            fontSize: 9,
            color: FAINT,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Current tab
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title || "Untitled page"}
        </Typography>
        <Typography sx={{ fontSize: 10, color: MUTED }}>{hostname || "—"}</Typography>
      </Stack>
    </Card>
  );
}

function ScanningCard({ hostname, title }: { hostname: string; title: string }) {
  return (
    <Card>
      <Stack direction="row" alignItems="flex-start" spacing={1.25}>
        <CircularProgress size={14} sx={{ color: ACCENT, mt: 0.25 }} />
        <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 12, color: TEXT, fontWeight: 500 }}>
            Reading page…
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              color: FAINT,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title || hostname || "this tab"}
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}

function ResumePill({
  resume,
}: {
  resume: { source_filename: string; source_kind: string; updated_at: string };
}) {
  const filename = resume.source_filename || "resume.md";
  const updated = new Date(resume.updated_at).toLocaleDateString();
  const badge = resume.source_kind.toUpperCase();
  const badgeColor =
    resume.source_kind === "pdf"
      ? "#dc2626"
      : resume.source_kind === "docx"
        ? "#1d4ed8"
        : "#374151";
  return (
    <Card sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          width: 30,
          height: 36,
          background: badgeColor,
          borderRadius: 0.75,
          color: "#fff",
          fontSize: 9,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 0.5,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {badge}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: TEXT,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {filename}
        </Typography>
        <Typography sx={{ fontSize: 10, color: MUTED, mt: 0.25 }}>
          updated {updated} · parsed ✓
        </Typography>
      </Box>
    </Card>
  );
}
