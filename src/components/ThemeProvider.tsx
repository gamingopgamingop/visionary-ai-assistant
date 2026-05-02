import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  applyTheme, loadThemeState, saveThemeState, allThemes,
  loadCustomThemes, saveCustomThemes,
  type Mode, type Theme,
} from "@/lib/theme";

interface Ctx {
  themeId: string;
  mode: Mode;
  themes: Theme[];
  setThemeId: (id: string) => void;
  setMode: (m: Mode) => void;
  saveCustomTheme: (theme: Theme) => void;
  deleteCustomTheme: (id: string) => void;
  refresh: () => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const initial = loadThemeState();
  const [themeId, setThemeIdState] = useState(initial.themeId);
  const [mode, setModeState] = useState<Mode>(initial.mode);
  const [themes, setThemes] = useState<Theme[]>(allThemes());

  // Apply on mount + whenever theme/mode changes
  useEffect(() => {
    applyTheme(themeId, mode);
    saveThemeState({ themeId, mode });
  }, [themeId, mode]);

  // React to system preference change when mode === "system"
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(themeId, mode);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, themeId]);

  const refresh = useCallback(() => setThemes(allThemes()), []);

  const setThemeId = useCallback((id: string) => setThemeIdState(id), []);
  const setMode = useCallback((m: Mode) => setModeState(m), []);

  const saveCustomTheme = useCallback((theme: Theme) => {
    const customs = loadCustomThemes();
    const idx = customs.findIndex((t) => t.id === theme.id);
    if (idx >= 0) customs[idx] = theme;
    else customs.push(theme);
    saveCustomThemes(customs);
    setThemes(allThemes());
  }, []);

  const deleteCustomTheme = useCallback((id: string) => {
    const customs = loadCustomThemes().filter((t) => t.id !== id);
    saveCustomThemes(customs);
    setThemes(allThemes());
    setThemeIdState((curr) => (curr === id ? "default" : curr));
  }, []);

  return (
    <ThemeCtx.Provider value={{ themeId, mode, themes, setThemeId, setMode, saveCustomTheme, deleteCustomTheme, refresh }}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
