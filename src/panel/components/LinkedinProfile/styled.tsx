// scout-chrome/src/panel/components/LinkedinProfile/styled.tsx
import { Box, Button, IconButton, TextField, styled } from "@mui/material";
import { ACCENT, BORDER_HI, DIM, FAINT, MUTED, SURFACE, TEXT } from "../../theme";

export const ViewRoot = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  height: "100%",
  overflow: "auto",
});

export const Card = styled(Box)({
  background: SURFACE,
  border: `1px solid ${BORDER_HI}`,
  borderRadius: 8,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const SectionHeader = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export const SectionTitle = styled("h3")({
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  color: TEXT,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const Rationale = styled("p")({
  margin: 0,
  fontSize: 11,
  color: MUTED,
  lineHeight: 1.4,
});

export const SuggestionText = styled("pre")({
  margin: 0,
  padding: 10,
  background: "#0a0e14",
  border: `1px solid ${BORDER_HI}`,
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 1.5,
  color: TEXT,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
});

export const SmallButton = styled(Button)({
  fontSize: 11,
  padding: "4px 8px",
  minWidth: 0,
  background: ACCENT,
  color: "#0a0e14",
  textTransform: "none",
  "&:hover": { background: ACCENT, opacity: 0.9 },
});

export const GhostIconButton = styled(IconButton)({
  padding: 4,
  color: DIM,
  "&:hover": { color: TEXT },
});

export const RoleInput = styled(TextField)({
  "& .MuiInputBase-root": {
    background: SURFACE,
    color: TEXT,
    fontSize: 12,
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER_HI },
  "& .MuiInputLabel-root": { color: FAINT, fontSize: 12 },
});

export const ChecklistRow = styled("div")<{ status: "pass" | "fail" | "indeterminate" }>(
  ({ status }) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 10px",
    borderLeft:
      status === "pass"
        ? `3px solid #22c55e`
        : status === "fail"
          ? `3px solid #ef4444`
          : `3px solid ${MUTED}`,
    background: SURFACE,
    borderRadius: 4,
    fontSize: 11,
    color: TEXT,
  }),
);

export const ChecklistGroupTitle = styled("h4")({
  margin: "12px 0 4px",
  fontSize: 11,
  fontWeight: 700,
  color: FAINT,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
});
