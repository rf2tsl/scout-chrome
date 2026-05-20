import { useState } from "react";
import { Alert, Button, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import type { ActiveTabInfo } from "@/shared/types";
import { useLinkedinProfile } from "../hooks/useLinkedinProfile";
import { SuggestionsTab } from "../components/LinkedinProfile/SuggestionsTab";
import { ChecklistTab } from "../components/LinkedinProfile/ChecklistTab";
import { TargetRoleInput } from "../components/LinkedinProfile/TargetRoleInput";
import { ViewRoot } from "../components/LinkedinProfile/styled";
import { ACCENT, DIM, MUTED, SURFACE, TEXT } from "../theme";

interface Props {
  tab: ActiveTabInfo;
}

export function LinkedinProfile({ tab }: Props) {
  const { state, targetRole, setTargetRole, scan } = useLinkedinProfile(tab.url);
  const [activeTab, setActiveTab] = useState<"suggestions" | "checklist">("suggestions");

  const isBusy = state.kind === "scraping" || state.kind === "analyzing";
  const canScan = !isBusy && targetRole.trim().length > 0;

  return (
    <ViewRoot>
      <Stack gap={1}>
        <Typography sx={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
          LinkedIn Profile
        </Typography>
        <Typography sx={{ fontSize: 11, color: MUTED, wordBreak: "break-all" }}>
          {tab.url}
        </Typography>
      </Stack>

      <TargetRoleInput value={targetRole} onChange={setTargetRole} disabled={isBusy} />

      <Button
        variant="contained"
        fullWidth
        disabled={!canScan}
        onClick={() => void scan(tab.tabId)}
        sx={{
          background: ACCENT,
          color: "#0a0e14",
          "&:hover": { background: ACCENT, opacity: 0.9 },
        }}
      >
        {state.kind === "scraping"
          ? "Reading page…"
          : state.kind === "analyzing"
            ? "Analyzing…"
            : state.kind === "done"
              ? "Re-scan profile"
              : "Scan profile"}
      </Button>

      {state.kind === "loading-cache" && (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={14} sx={{ color: ACCENT }} />
          <Typography sx={{ fontSize: 11, color: DIM }}>Loading last scan…</Typography>
        </Stack>
      )}

      {(state.kind === "scraping" || state.kind === "analyzing") && (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={14} sx={{ color: ACCENT }} />
          <Typography sx={{ fontSize: 11, color: DIM }}>
            {state.kind === "scraping" ? "Reading page…" : "Analyzing with Claude…"}
          </Typography>
        </Stack>
      )}

      {state.kind === "error" && (
        <Alert severity="error" sx={{ background: SURFACE }}>
          {state.message}
        </Alert>
      )}

      {state.kind === "done" && (
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
            <SuggestionsTab suggestions={state.suggestion.suggestions} />
          ) : (
            <ChecklistTab items={state.suggestion.checklist_results} />
          )}
        </>
      )}
    </ViewRoot>
  );
}
