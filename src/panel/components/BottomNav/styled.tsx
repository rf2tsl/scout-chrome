// scout-chrome/src/panel/components/BottomNav/styled.tsx
import { Box, ButtonBase, styled } from "@mui/material";
import { ACCENT, BORDER_HI, DIM, SURFACE, TEXT } from "../../theme";

export const Bar = styled(Box)({
  display: "flex",
  height: 48,
  borderTop: `1px solid ${BORDER_HI}`,
  background: SURFACE,
  flexShrink: 0,
});

export const TabButton = styled(ButtonBase, { shouldForwardProp: (p) => p !== "active" })<{
  active?: boolean;
}>(({ active }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  color: active ? ACCENT : DIM,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  borderTop: active ? `2px solid ${ACCENT}` : "2px solid transparent",
  marginTop: -1,
  "&:hover": { color: active ? ACCENT : TEXT, background: "rgba(255,255,255,0.02)" },
}));

export const Glyph = styled("span")({
  fontSize: 16,
  lineHeight: 1,
});

export const Label = styled("span")({
  fontSize: 9,
  fontWeight: 600,
});
