import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  ACCENT,
  BORDER,
  FAINT,
  FOOTER_BG,
  MUTED,
  SURFACE,
  TEXT,
} from "./theme";

// ─── Shell layout ────────────────────────────────────────────────────────

// Fills its container (the side panel mount point or the PanelShell scroll
// area). Header + Footer hold their natural height; Body is the flexible
// scroll region in between. Fixed-height variants would shove the footer
// behind the bottom nav when the side panel is taller or shorter than the
// legacy 560px popup window.
export const PopupRoot = styled(Box)({
  height: "100%",
  minHeight: 0,
  background: "transparent",
  color: TEXT,
  display: "flex",
  flexDirection: "column",
  fontSize: 13,
});

export const Header = styled(Box)({
  padding: "12px 14px",
  borderBottom: `1px solid ${BORDER}`,
  display: "flex",
  alignItems: "center",
  gap: 10,
});

export const HeaderIcon = styled(Box)({
  width: 26,
  height: 26,
  borderRadius: 6,
  background: `${ACCENT}22`,
  border: `1px solid ${ACCENT}44`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: ACCENT,
  fontSize: 13,
  flexShrink: 0,
});

export const HeaderTitle = styled(Typography)({
  fontWeight: 700,
  letterSpacing: "-0.01em",
  fontSize: 13,
  lineHeight: 1.15,
  color: TEXT,
});

export const HeaderTagline = styled(Typography)({
  fontSize: 10,
  color: FAINT,
  marginTop: 1,
  lineHeight: 1.2,
});

export const HeaderBadge = styled(Box)({
  fontSize: 9,
  padding: "1px 5px",
  background: `${ACCENT}22`,
  color: ACCENT,
  borderRadius: 3,
  letterSpacing: "0.06em",
  fontWeight: 600,
  textTransform: "uppercase",
});

export const Body = styled(Box)({
  flex: 1,
  overflowY: "auto",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 0,
});

export const Footer = styled(Box)({
  padding: "10px 14px",
  borderTop: `1px solid ${BORDER}`,
  background: FOOTER_BG,
});

// ─── Reusable cards ──────────────────────────────────────────────────────

export const Card = styled(Box)({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "10px 12px",
});

export const PaddedCard = styled(Box)({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: 14,
});

export const SectionLabelRow = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  padding: "4px 2px 0",
});

export const SectionLabelText = styled(Typography)({
  fontSize: 9,
  color: FAINT,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 600,
});

export const SectionHint = styled(Typography)({
  fontSize: 10,
  color: FAINT,
});

// Status dot used in the Detected-on-page card
export const StatusDot = styled(Box)({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: ACCENT,
  boxShadow: `0 0 6px ${ACCENT}`,
});

// Spinner ring used in the Analyzing state
export const SpinnerRing = styled(Box)({
  position: "relative",
  width: 64,
  height: 64,
  "& .ring-bg": {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `3px solid ${BORDER}`,
  },
  "& .ring-fg": {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "3px solid transparent",
    borderTopColor: ACCENT,
    borderRightColor: ACCENT,
    animation: "scout-spin 1.1s linear infinite",
  },
  "& .ring-glyph": {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: ACCENT,
    fontSize: 18,
  },
  "@keyframes scout-spin": {
    to: { transform: "rotate(360deg)" },
  },
});

// Tag chip used inside detected-job card
export const TagChip = styled(Box)({
  fontSize: 10,
  padding: "2px 7px",
  background: "#111827",
  color: "#9ca3af",
  borderRadius: 3,
  border: `1px solid ${BORDER}`,
});

export const CapsuleNote = styled(Typography)({
  fontSize: 11,
  color: MUTED,
  fontStyle: "italic",
});
