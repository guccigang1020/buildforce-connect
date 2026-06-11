import { type ReactNode } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import rtlPluginImport from "stylis-plugin-rtl";

// CJS/ESM interop: under Vite SSR the default import can be the module
// namespace ({ default: fn }) instead of the function itself — unwrap it,
// otherwise emotion's stylis middleware crashes ("e[i] is not a function").
const rtlPlugin =
  typeof rtlPluginImport === "function"
    ? rtlPluginImport
    : (rtlPluginImport as { default: typeof rtlPluginImport }).default;

// RTL style cache — MUI flips margins/paddings/positions for Hebrew.
const rtlCache = createCache({
  key: "mui-rtl",
  stylisPlugins: [rtlPlugin],
});

// BuildForce theme — ColorHunt palette 146C78 · 0E91A1 · 7DCE94 · EFEDE7,
// matched to the CSS tokens in styles.css. Flat, clean Material.
export const muiTheme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
    primary: { main: "#146C78", light: "#0E91A1", dark: "#0E4E57", contrastText: "#FDFCFA" },
    secondary: { main: "#0E91A1", contrastText: "#FDFCFA" },
    success: { main: "#3F8D5C", light: "#7DCE94" },
    warning: { main: "#A8761B" },
    error: { main: "#A8442E" },
    info: { main: "#0E91A1" },
    background: { default: "#EFEDE7", paper: "#FFFFFF" },
    text: { primary: "#22363B", secondary: "#5C6B6E" },
    divider: "#DCD8CC",
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Rubik", "Heebo", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minWidth: 0 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12, backgroundImage: "none" },
      },
    },
    MuiTab: {
      styleOverrides: { root: { minHeight: 40 } },
    },
    MuiTabs: {
      styleOverrides: { root: { minHeight: 40 } },
    },
  },
});

export function MuiProvider({ children }: { children: ReactNode }) {
  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </CacheProvider>
  );
}
