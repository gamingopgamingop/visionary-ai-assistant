/**
 * Lightweight theme system with built-in + custom themes and dark/light mode.
 * Themes are HSL palettes written into CSS variables on <html>.
 */

export type Mode = "light" | "dark" | "system";

export interface ThemePalette {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  ring: string;
}

export interface Theme {
  id: string;
  name: string;
  builtin?: boolean;
  light: ThemePalette;
  dark: ThemePalette;
}

const VAR_MAP: Record<keyof ThemePalette, string[]> = {
  background: ["--background"],
  foreground: ["--foreground", "--card-foreground", "--popover-foreground"],
  primary: ["--primary"],
  primaryForeground: ["--primary-foreground"],
  secondary: ["--secondary", "--secondary-foreground"],
  accent: ["--accent", "--accent-foreground"],
  muted: ["--muted", "--muted-foreground"],
  border: ["--border", "--input"],
  ring: ["--ring"],
};

export const BUILTIN_THEMES: Theme[] = [
  {
    id: "default",
    name: "Default",
    builtin: true,
    light: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      primary: "222.2 47.4% 11.2%",
      primaryForeground: "210 40% 98%",
      secondary: "210 40% 96.1%",
      accent: "210 40% 96.1%",
      muted: "210 40% 96.1%",
      border: "214.3 31.8% 91.4%",
      ring: "222.2 84% 4.9%",
    },
    dark: {
      background: "222.2 84% 4.9%",
      foreground: "210 40% 98%",
      primary: "210 40% 98%",
      primaryForeground: "222.2 47.4% 11.2%",
      secondary: "217.2 32.6% 17.5%",
      accent: "217.2 32.6% 17.5%",
      muted: "217.2 32.6% 17.5%",
      border: "217.2 32.6% 17.5%",
      ring: "212.7 26.8% 83.9%",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    builtin: true,
    light: {
      background: "210 40% 98%",
      foreground: "215 50% 12%",
      primary: "210 90% 45%",
      primaryForeground: "210 40% 98%",
      secondary: "210 40% 92%",
      accent: "200 80% 90%",
      muted: "210 40% 94%",
      border: "210 30% 88%",
      ring: "210 90% 45%",
    },
    dark: {
      background: "215 40% 8%",
      foreground: "210 40% 96%",
      primary: "200 90% 60%",
      primaryForeground: "215 50% 10%",
      secondary: "215 30% 18%",
      accent: "210 40% 22%",
      muted: "215 30% 18%",
      border: "215 30% 22%",
      ring: "200 90% 60%",
    },
  },
  {
    id: "forest",
    name: "Forest",
    builtin: true,
    light: {
      background: "60 20% 98%",
      foreground: "140 30% 12%",
      primary: "150 55% 32%",
      primaryForeground: "60 20% 98%",
      secondary: "120 20% 92%",
      accent: "100 30% 88%",
      muted: "120 15% 94%",
      border: "120 15% 86%",
      ring: "150 55% 32%",
    },
    dark: {
      background: "140 20% 8%",
      foreground: "100 20% 95%",
      primary: "140 50% 55%",
      primaryForeground: "140 20% 8%",
      secondary: "140 15% 18%",
      accent: "120 20% 22%",
      muted: "140 15% 18%",
      border: "140 15% 22%",
      ring: "140 50% 55%",
    },
  },
  {
    id: "rose",
    name: "Rose",
    builtin: true,
    light: {
      background: "350 30% 99%",
      foreground: "340 30% 12%",
      primary: "346 77% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "350 25% 94%",
      accent: "340 40% 92%",
      muted: "350 20% 95%",
      border: "350 20% 88%",
      ring: "346 77% 50%",
    },
    dark: {
      background: "340 25% 8%",
      foreground: "350 25% 96%",
      primary: "346 77% 60%",
      primaryForeground: "340 25% 10%",
      secondary: "340 20% 18%",
      accent: "346 30% 25%",
      muted: "340 20% 18%",
      border: "340 20% 22%",
      ring: "346 77% 60%",
    },
  },
];

const STORAGE_KEY = "ait_theme_v1";
const CUSTOM_THEMES_KEY = "ait_custom_themes_v1";

export interface ThemeState {
  themeId: string;
  mode: Mode;
}

export function loadThemeState(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { themeId: "default", mode: "system" };
}

export function saveThemeState(state: ThemeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadCustomThemes(): Theme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: Theme[]) {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

export function allThemes(): Theme[] {
  return [...BUILTIN_THEMES, ...loadCustomThemes()];
}

export function resolveMode(mode: Mode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(themeId: string, mode: Mode) {
  const theme = allThemes().find((t) => t.id === themeId) ?? BUILTIN_THEMES[0];
  const resolved = resolveMode(mode);
  const palette = resolved === "dark" ? theme.dark : theme.light;
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");

  (Object.entries(VAR_MAP) as [keyof ThemePalette, string[]][]).forEach(
    ([key, vars]) => {
      const value = palette[key];
      vars.forEach((v) => root.style.setProperty(v, value));
    },
  );
  // card / popover follow background by default for our themes
  root.style.setProperty("--card", palette.background);
  root.style.setProperty("--popover", palette.background);
}
