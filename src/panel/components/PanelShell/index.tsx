// scout-chrome/src/panel/components/PanelShell/index.tsx
import type { ReactNode } from "react";
import { Box } from "@mui/material";
import type { PanelTab } from "@/shared/types";
import { BottomNav } from "../BottomNav";

interface Props {
  tab: PanelTab;
  onTabChange: (t: PanelTab) => void;
  children: ReactNode;
}

export function PanelShell({ tab, onTabChange, children }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>{children}</Box>
      <BottomNav active={tab} onChange={onTabChange} />
    </Box>
  );
}
