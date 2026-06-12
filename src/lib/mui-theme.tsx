import { useState, type ReactNode } from "react";
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
// Must be created PER RENDER, not as a module singleton: emotion dedupes
// against a cache's `inserted` registry, so a shared server cache emits the
// critical <style> tags on the first request only and nothing thereafter —
// every later SSR response then ships MUI markup with no styles, causing a
// flash of unstyled components until the client hydrates. A fresh cache per
// request re-emits the inline styles every time; on the client the lazy
// initializer runs once and hydrates from the SSR <style data-emotion> tags.
const createRtlCache = () =>
  createCache({
    key: "mui-rtl",
    stylisPlugins: [rtlPlugin],
  });

// BuildForce theme — ColorHunt palette 146C78 · 0E91A1 · 7DCE94 · EFEDE7,
// matched to the CSS tokens in styles.css. Flat, clean Material.
export const muiTheme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
    // Indigo → violet accent (matches the --primary / --primary-glow CSS tokens).
    // MUI `contained primary` buttons read these, so they must stay in sync.
    primary: { main: "#5B57F0", light: "#8B7CF8", dark: "#4038C0", contrastText: "#FDFCFA" },
    secondary: { main: "#8B5CF6", contrastText: "#FDFCFA" },
    success: { main: "#3F8D5C", light: "#7DCE94" },
    warning: { main: "#A8761B" },
    error: { main: "#A8442E" },
    info: { main: "#6366F1" },
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
  // One cache per provider instance: a fresh cache for each SSR request, and a
  // single stable cache on the client (the lazy initializer runs once).
  const [cache] = useState(createRtlCache);
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </CacheProvider>
  );
}
