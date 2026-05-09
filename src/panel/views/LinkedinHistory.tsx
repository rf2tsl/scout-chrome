// scout-chrome/src/panel/views/LinkedinHistory.tsx
import { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, IconButton, Stack, Tab, Tabs, Typography } from "@mui/material";
import { apiFetch } from "@/shared/api";
import type { ProfileSuggestion } from "@/shared/types";
import { ChecklistTab } from "../components/LinkedinProfile/ChecklistTab";
import { SuggestionsTab } from "../components/LinkedinProfile/SuggestionsTab";
import { ViewRoot } from "../components/LinkedinProfile/styled";
import { HistoryListRow } from "../components/HistoryList/HistoryListRow";
import { EmptyMessage, ListRoot } from "../components/HistoryList/styled";
import { useLinkedinHistory } from "../hooks/useLinkedinHistory";
import { ACCENT, DIM, MUTED, SURFACE, TEXT } from "../theme";

function profileSlug(url: string): string {
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : url;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "today";
  if (diffMs < 2 * day) return "yesterday";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return d.toLocaleDateString();
}

export function LinkedinHistory() {
  const { state, remove } = useLinkedinHistory();
  const [openId, setOpenId] = useState<number | null>(null);

  if (openId !== null) {
    return <DetailView id={openId} onBack={() => setOpenId(null)} />;
  }

  const visibleItems = state.kind === "ready"
    ? state.items.filter((x) => x.status !== "error")
    : [];

  return (
    <ViewRoot>
      <Typography sx={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
        Past LinkedIn scans
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

      {state.kind === "ready" && visibleItems.length === 0 && (
        <EmptyMessage>No scans yet. Scan a LinkedIn profile from the Home tab.</EmptyMessage>
      )}

      {state.kind === "ready" && visibleItems.length > 0 && (
        <ListRoot>
          {visibleItems.map((item) => (
            <HistoryListRow
              key={item.id}
              data={{
                id: item.id,
                title: profileSlug(item.profile_url),
                subtitle: item.target_role,
                badge:
                  item.status === "pending"
                    ? { text: "pending", tone: "warn" }
                    : undefined,
                dateLabel: relativeDate(item.created_at),
              }}
              onOpen={(id) => setOpenId(id)}
              onDelete={(id) => {
                if (!confirm("Delete this scan?")) return;
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
  const [data, setData] = useState<ProfileSuggestion | null>(null);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"suggestions" | "checklist">("suggestions");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await apiFetch<ProfileSuggestion>(`/api/linkedin/profile-suggestions/${id}/`);
      setData(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
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
            LinkedIn scan
          </Typography>
          {data && (
            <Typography sx={{ fontSize: 11, color: MUTED, wordBreak: "break-all" }}>
              {data.profile_url}
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

      {data && (
        <>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 32,
              "& .MuiTab-root": { minHeight: 32, fontSize: 11, color: DIM, padding: "4px 12px" },
              "& .Mui-selected": { color: ACCENT },
              "& .MuiTabs-indicator": { background: ACCENT },
            }}
          >
            <Tab value="suggestions" label="Suggestions" />
            <Tab value="checklist" label="Checklist" />
          </Tabs>
          {activeTab === "suggestions" ? (
            <SuggestionsTab suggestions={data.suggestions} />
          ) : (
            <ChecklistTab items={data.checklist_results} />
          )}
        </>
      )}
    </ViewRoot>
  );
}
