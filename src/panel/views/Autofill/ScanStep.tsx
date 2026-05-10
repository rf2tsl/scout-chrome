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
import { ACCENT, FAINT, MUTED, TEXT } from "../../theme";
import type { OptimizationListItem } from "@/shared/types";

interface Props {
  defaultOptimizationId: number | null;
  scanning: boolean;
  errorMessage?: string;
  activeTabUrl: string;
  activeTabTitle: string;
  onScan: (optimizationId: number) => void;
  onCancel: () => void;
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
  const { state } = useOptimizationHistory();
  const items: OptimizationListItem[] =
    state.kind === "ready" ? state.items.filter((i) => i.status === "succeeded") : [];

  const [selected, setSelected] = useState<number | null>(defaultOptimizationId);
  useEffect(() => {
    const first = items[0];
    if (selected == null && first != null) setSelected(first.id);
  }, [items, selected]);

  const hostname = useMemo(() => {
    try {
      return new URL(activeTabUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }, [activeTabUrl]);

  if (state.kind === "loading") {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={18} sx={{ color: ACCENT }} />
      </Stack>
    );
  }
  if (state.kind === "error") {
    return <Alert severity="error">{state.message}</Alert>;
  }
  if (items.length === 0) {
    return (
      <Alert severity="info">
        Optimize a resume first — the autofill needs at least one to work from.
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
          Optimization
        </Typography>
        <Select
          fullWidth
          size="small"
          value={selected ?? ""}
          onChange={(e) => setSelected(Number(e.target.value))}
          sx={{ fontSize: 12, color: TEXT }}
        >
          {items.map((it) => (
            <MenuItem key={it.id} value={it.id} sx={{ fontSize: 12 }}>
              {it.job_context_title || `Optimization #${it.id}`}
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
          onClick={() => selected != null && onScan(selected)}
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
