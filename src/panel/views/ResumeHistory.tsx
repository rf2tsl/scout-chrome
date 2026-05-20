// scout-chrome/src/panel/views/ResumeHistory.tsx
import { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from "@mui/material";
import { apiFetch } from "@/shared/api";
import { toUserMessage } from "@/shared/userError";
import type { OptimizationDetail } from "@/shared/types";
import { OptimizationResultView } from "../components/OptimizationResultView";
import { ViewRoot } from "../components/LinkedinProfile/styled";
import { HistoryListRow } from "../components/HistoryList/HistoryListRow";
import { EmptyMessage, ListRoot } from "../components/HistoryList/styled";
import { useOptimizationHistory } from "../hooks/useOptimizationHistory";
import { ACCENT, DIM, MUTED, SURFACE, TEXT } from "../theme";

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "today";
  if (diffMs < 2 * day) return "yesterday";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return d.toLocaleDateString();
}

const KIND_LABEL: Record<string, string> = {
  saved_job: "Saved job",
  pasted: "Pasted listing",
  described: "Described role",
};

export function ResumeHistory() {
  const { state, remove } = useOptimizationHistory();
  const [openId, setOpenId] = useState<number | null>(null);

  if (openId !== null) {
    return <DetailView id={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <ViewRoot>
      <Typography sx={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
        Past resume optimizations
      </Typography>

      {state.kind === "loading" && (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={14} sx={{ color: ACCENT }} />
          <Typography sx={{ fontSize: 11, color: DIM }}>Loading…</Typography>
        </Stack>
      )}

      {state.kind === "error" && (
        <Alert severity="error" sx={{ background: SURFACE }}>
          {state.message}
        </Alert>
      )}

      {state.kind === "ready" && state.items.length === 0 && (
        <EmptyMessage>No optimizations yet.</EmptyMessage>
      )}

      {state.kind === "ready" && state.items.length > 0 && (
        <ListRoot>
          {state.items.map((item) => (
            <HistoryListRow
              key={item.id}
              data={{
                id: item.id,
                title: item.job_context_title || KIND_LABEL[item.job_context_kind] || "Optimization",
                subtitle: KIND_LABEL[item.job_context_kind] || item.job_context_kind,
                badge:
                  item.status === "succeeded"
                    ? { text: "done", tone: "success" }
                    : item.status === "failed"
                      ? { text: "failed", tone: "error" }
                      : { text: "running", tone: "warn" },
                dateLabel: relativeDate(item.completed_at || item.created_at),
              }}
              onOpen={(id) => setOpenId(id)}
              onDelete={(id) => {
                if (!confirm("Delete this optimization?")) return;
                void remove(id);
              }}
            />
          ))}
        </ListRoot>
      )}
    </ViewRoot>
  );
}

function DetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const [data, setData] = useState<OptimizationDetail | null>(null);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await apiFetch<OptimizationDetail>(`/api/resume/optimizations/${id}/`);
      setData(r);
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ViewRoot>
      <Stack direction="row" alignItems="center" gap={1}>
        <IconButton onClick={onBack} sx={{ color: DIM, padding: 0.5 }} aria-label="Back">
          ←
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
            {data?.job_context_title || "Optimization"}
          </Typography>
          {data && (
            <Typography sx={{ fontSize: 11, color: MUTED }}>
              {data.status} · {KIND_LABEL[data.job_context_kind] || data.job_context_kind}
            </Typography>
          )}
        </Box>
      </Stack>

      {!data && !error && (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={14} sx={{ color: ACCENT }} />
          <Typography sx={{ fontSize: 11, color: DIM }}>Loading…</Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ background: SURFACE }}>
          {error}
        </Alert>
      )}

      {data && data.status === "succeeded" && (
        <OptimizationResultView
          changeSummary={data.change_summary}
          recruiterReview={data.recruiter_review}
        />
      )}

      {data && data.status === "failed" && (
        <Alert severity="error" sx={{ background: SURFACE }}>
          {data.error_message || "Optimization failed."}
        </Alert>
      )}

      {data && data.status === "running" && (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={14} sx={{ color: ACCENT }} />
          <Typography sx={{ fontSize: 11, color: DIM }}>Still running…</Typography>
        </Stack>
      )}
    </ViewRoot>
  );
}
