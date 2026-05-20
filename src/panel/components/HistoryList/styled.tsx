// scout-chrome/src/panel/components/HistoryList/styled.tsx
import { Box, ButtonBase, IconButton, styled } from "@mui/material";
import { BORDER_HI, DIM, MUTED, SURFACE, TEXT } from "../../theme";

export const ListRoot = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "8px 8px 12px",
});

export const Row = styled(ButtonBase)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  background: SURFACE,
  border: `1px solid ${BORDER_HI}`,
  borderRadius: 8,
  textAlign: "left",
  width: "100%",
  cursor: "pointer",
  "&:hover": { background: "rgba(255,255,255,0.03)" },
});

export const RowMain = styled(Box)({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
  gap: 2,
});

export const RowTitle = styled("span")({
  fontSize: 12,
  fontWeight: 600,
  color: TEXT,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const RowSubtitle = styled("span")({
  fontSize: 11,
  color: MUTED,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const RowMeta = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
});

export const RowDate = styled("span")({
  fontSize: 10,
  color: DIM,
});

export const Badge = styled("span")<{ tone: "success" | "warn" | "error" | "neutral" }>(
  ({ tone }) => ({
    fontSize: 9,
    padding: "1px 6px",
    borderRadius: 3,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color:
      tone === "success" ? "#22c55e"
      : tone === "warn" ? "#facc15"
      : tone === "error" ? "#ef4444"
      : MUTED,
    background:
      tone === "success" ? "rgba(34,197,94,0.15)"
      : tone === "warn" ? "rgba(250,204,21,0.15)"
      : tone === "error" ? "rgba(239,68,68,0.15)"
      : "rgba(255,255,255,0.05)",
  }),
);

export const TrashButton = styled(IconButton)({
  padding: 4,
  color: DIM,
  "&:hover": { color: "#ef4444" },
});

export const EmptyMessage = styled("div")({
  padding: 24,
  textAlign: "center",
  color: MUTED,
  fontSize: 12,
});
