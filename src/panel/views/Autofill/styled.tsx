import { Box, Stack } from "@mui/material";
import { styled } from "@mui/material/styles";
import { BORDER_HI, SURFACE, TEXT } from "../../theme";

export const SectionCard = styled(Box)({
  background: SURFACE,
  border: `1px solid ${BORDER_HI}`,
  borderRadius: 8,
  padding: 12,
});

export const SectionHeader = styled(Stack)({
  alignItems: "center",
  justifyContent: "space-between",
  flexDirection: "row",
  cursor: "pointer",
  color: TEXT,
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "4px 0",
});

export const FieldRowOuter = styled(Stack)({
  gap: "4px",
  padding: "10px 0",
  borderBottom: `1px solid rgba(255,255,255,0.04)`,
});
