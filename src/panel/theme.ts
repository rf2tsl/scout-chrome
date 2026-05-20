import { createTheme } from "@mui/material/styles";

// Color tokens lifted directly from the design (Scout Extension Standalone).
export const ACCENT     = "#00d4aa";
export const BG         = "#080c12";
export const SURFACE    = "#0d1117";
export const SURFACE_2  = "#111827";
export const FOOTER_BG  = "#06090e";
export const BORDER     = "#1f2937";
export const BORDER_HI  = "#374151";
export const TEXT       = "#f3f4f6";
export const DIM        = "#9ca3af";
export const MUTED      = "#6b7280";
export const FAINT      = "#4b5563";

const FONT_STACK =
  "'Space Grotesk', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: ACCENT, contrastText: "#0a0e14" },
    background: { default: BG, paper: SURFACE },
    text: { primary: TEXT, secondary: DIM },
    divider: BORDER,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: FONT_STACK,
    fontSize: 13,
    body2: { fontSize: 12, lineHeight: 1.55 },
    button: { textTransform: "none", fontWeight: 600, fontSize: 13 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { background: BG, fontFamily: FONT_STACK },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 7, textTransform: "none", fontFamily: FONT_STACK },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          background: SURFACE,
          border: `1px solid ${BORDER}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 7, fontFamily: FONT_STACK } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 7, fontFamily: FONT_STACK, fontSize: 12 },
      },
    },
  },
});
