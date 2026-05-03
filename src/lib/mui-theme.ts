import { createTheme } from "@mui/material/styles";

// MUI theme tuned to match the project's clean white / minimal aesthetic.
// Reads HSL CSS variables from index.css so it stays in sync with shadcn tokens.
const cssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
};

export const muiTheme = createTheme({
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    button: { textTransform: "none", fontWeight: 500 },
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 600, letterSpacing: "-0.01em" },
    h3: { fontWeight: 600 },
  },
  palette: {
    mode: "light",
    primary: { main: cssVar("--primary", "hsl(222.2 47.4% 11.2%)") },
    background: {
      default: cssVar("--background", "#ffffff"),
      paper: cssVar("--card", "#ffffff"),
    },
    divider: cssVar("--border", "hsl(214.3 31.8% 91.4%)"),
    text: {
      primary: cssVar("--foreground", "hsl(222.2 84% 4.9%)"),
      secondary: cssVar("--muted-foreground", "hsl(215.4 16.3% 46.9%)"),
    },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${cssVar("--border", "hsl(214.3 31.8% 91.4%)")}`,
          boxShadow: "none",
          transition: "transform .15s ease, box-shadow .15s ease",
        },
      },
    },
  },
});
