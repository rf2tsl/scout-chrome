import { createTheme } from "@mui/material/styles";

export const ACCENT = "#37c172";       // mirrors scout-frontend's accent green
export const SURFACE = "#161b22";
export const BORDER = "#30363d";
export const TEXT_PRIMARY = "#e6edf3";
export const TEXT_SECONDARY = "#8b949e";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: ACCENT },
    background: { default: "#0e1116", paper: SURFACE },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY },
    divider: BORDER,
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    body2: { fontSize: 13, lineHeight: 1.5 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 0, textTransform: "none" } },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", border: `1px solid ${BORDER}` },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
  },
});
