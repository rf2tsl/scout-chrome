import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { ACCENT, BORDER, SURFACE } from "./theme";

export const PanelRoot = styled(Box)({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: "100vh",
});

export const Header = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  borderBottom: `1px solid ${BORDER}`,
  background: SURFACE,
});

export const Body = styled(Box)({
  flex: 1,
  padding: 14,
  overflowY: "auto",
});

export const AccentCard = styled(Box)({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  padding: 14,
  boxShadow: `0 2px 12px ${ACCENT}33`,
});
