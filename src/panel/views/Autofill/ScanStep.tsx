import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useOptimizationHistory } from "../../hooks/useOptimizationHistory";
import { useResume } from "../../hooks/useResume";
import { ACCENT, FAINT, MUTED, TEXT } from "../../theme";
import type { AutofillSource, OptimizationListItem } from "@/shared/types";

interface Props {
  defaultOptimizationId: number | null;
  scanning: boolean;
  errorMessage?: string;
  activeTabUrl: string;
  activeTabTitle: string;
  onScan: (source: AutofillSource) => void;
  onCancel: () => void;
}

type Option =
  | { value: "base"; label: string }
  | { value: `opt:${number}`; label: string };

function encodeOptimization(id: number): `opt:${number}` {
  return `opt:${id}` as const;
}

function decodeSelection(v: string): AutofillSource | null {
  if (v === "base") return { kind: "base" };
  if (v.startsWith("opt:")) {
    const id = Number(v.slice(4));
    return Number.isFinite(id) ? { kind: "optimization", id } : null;
  }
  return null;
}

export function ScanStep({
  defaultOptimizationId,
  scanning,
  errorMessage,
  activeTabUrl,
  activeTabTitle,
  onScan,
  onCancel,
}: Props) {
  const { state: histState } = useOptimizationHistory();
  const { state: resumeState } = useResume();

  const optimizations: OptimizationListItem[] =
    histState.kind === "ready"
      ? histState.items.filter((i) => i.status === "succeeded")
      : [];

  const hasBase = resumeState.kind === "ready";
  const baseFilename = hasBase ? resumeState.resume.source_filename || "resume" : "";

  const options: Option[] = useMemo(() => {
    const out: Option[] = [];
    if (hasBase) out.push({ value: "base", label: `Base resume — ${baseFilename}` });
    for (const o of optimizations) {
      out.push({
        value: encodeOptimization(o.id),
        label: o.job_context_title || `Optimization #${o.id}`,
      });
    }
    return out;
  }, [hasBase, baseFilename, optimizations]);

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (selected != null) return;
    if (
      defaultOptimizationId != null &&
      optimizations.some((o) => o.id === defaultOptimizationId)
    ) {
      setSelected(encodeOptimization(defaultOptimizationId));
      return;
    }
    const first = options[0];
    if (first) setSelected(first.value);
  }, [defaultOptimizationId, optimizations, options, selected]);

  const hostname = useMemo(() => {
    try {
      return new URL(activeTabUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }, [activeTabUrl]);

  const loading = histState.kind === "loading" || resumeState.kind === "loading";

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={18} sx={{ color: ACCENT }} />
      </Stack>
    );
  }
  if (histState.kind === "error") return <Alert severity="error">{histState.message}</Alert>;
  if (resumeState.kind === "error") return <Alert severity="error">{resumeState.message}</Alert>;

  if (options.length === 0) {
    return (
      <Alert severity="info">
        Upload a base resume or run an optimization first — the autofill needs at least one to work from.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Box>
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
        <Typography sx={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>
          {activeTabTitle || "Untitled"}
        </Typography>
        <Typography sx={{ fontSize: 10, color: MUTED }}>{hostname || "—"}</Typography>
      </Box>

      <Box>
        <Typography
          sx={{
            fontSize: 9,
            color: FAINT,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          Source
        </Typography>
        <Select
          fullWidth
          size="small"
          value={selected ?? ""}
          onChange={(e) => setSelected(String(e.target.value))}
          sx={{ fontSize: 12, color: TEXT }}
        >
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12 }}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      <Stack direction="row" spacing={0.75}>
        <Button
          variant="contained"
          fullWidth
          disabled={scanning || selected == null}
          onClick={() => {
            const src = selected ? decodeSelection(selected) : null;
            if (src) onScan(src);
          }}
          sx={{
            background: ACCENT,
            color: "#0a0e14",
            "&:hover": { background: ACCENT, opacity: 0.9 },
          }}
        >
          {scanning ? "Scanning…" : "Scan this page"}
        </Button>
        <Button onClick={onCancel} sx={{ color: MUTED, fontSize: 12 }}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
