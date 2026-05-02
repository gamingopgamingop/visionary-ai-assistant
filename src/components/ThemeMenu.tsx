import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, Sun, Moon, Laptop, Plus, Trash2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import type { Theme, ThemePalette } from "@/lib/theme";
import { toast } from "sonner";

const PALETTE_FIELDS: { key: keyof ThemePalette; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "primary", label: "Primary" },
  { key: "primaryForeground", label: "Primary text" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "muted", label: "Muted" },
  { key: "border", label: "Border" },
  { key: "ring", label: "Ring" },
];

const blankPalette = (): ThemePalette => ({
  background: "0 0% 100%",
  foreground: "222 47% 11%",
  primary: "222 47% 11%",
  primaryForeground: "210 40% 98%",
  secondary: "210 40% 96%",
  accent: "210 40% 96%",
  muted: "210 40% 96%",
  border: "214 32% 91%",
  ring: "222 84% 5%",
});

const ThemeMenu = () => {
  const { themeId, mode, themes, setThemeId, setMode, saveCustomTheme, deleteCustomTheme } = useTheme();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Theme>(() => ({
    id: `custom-${Date.now()}`,
    name: "My theme",
    light: blankPalette(),
    dark: blankPalette(),
  }));

  const startNew = () => {
    setDraft({
      id: `custom-${Date.now()}`,
      name: "My theme",
      light: blankPalette(),
      dark: blankPalette(),
    });
    setEditorOpen(true);
  };

  const startEdit = (t: Theme) => {
    if (t.builtin) {
      // Clone built-in into a new custom theme
      setDraft({
        ...t,
        id: `custom-${Date.now()}`,
        name: `${t.name} (copy)`,
        builtin: false,
      });
    } else {
      setDraft(JSON.parse(JSON.stringify(t)));
    }
    setEditorOpen(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error("Theme needs a name");
      return;
    }
    saveCustomTheme({ ...draft, builtin: false });
    setThemeId(draft.id);
    setEditorOpen(false);
    toast.success(`Saved theme "${draft.name}"`);
  };

  const updatePalette = (which: "light" | "dark", key: keyof ThemePalette, value: string) =>
    setDraft((d) => ({ ...d, [which]: { ...d[which], [key]: value } }));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Palette className="h-4 w-4" />
            Theme
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as any)}>
            <DropdownMenuRadioItem value="light">
              <Sun className="h-4 w-4 mr-2" /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="h-4 w-4 mr-2" /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Laptop className="h-4 w-4 mr-2" /> System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Palette</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={themeId} onValueChange={setThemeId}>
            {themes.map((t) => (
              <DropdownMenuRadioItem key={t.id} value={t.id}>
                <span
                  className="inline-block h-3 w-3 rounded-full mr-2 border"
                  style={{ background: `hsl(${t.light.primary})` }}
                />
                <span className="flex-1">{t.name}</span>
                {!t.builtin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteCustomTheme(t.id);
                    }}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                    aria-label="Delete theme"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={startNew}>
            <Plus className="h-4 w-4 mr-2" /> New custom theme…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => startEdit(themes.find((t) => t.id === themeId) ?? themes[0])}>
            <Palette className="h-4 w-4 mr-2" /> Edit current as new…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Custom theme editor</DialogTitle>
            <DialogDescription>
              Enter HSL values like <code>222 47% 11%</code>. Both light and dark variants are saved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Theme name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>

            <ScrollArea className="max-h-[420px] pr-2">
              <div className="grid grid-cols-2 gap-4">
                {(["light", "dark"] as const).map((variant) => (
                  <div key={variant} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {variant}
                    </p>
                    {PALETTE_FIELDS.map(({ key, label }) => (
                      <div key={key} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{label}</Label>
                          <Input
                            value={draft[variant][key]}
                            onChange={(e) => updatePalette(variant, key, e.target.value)}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        <div
                          className="h-7 w-7 rounded border mt-3"
                          style={{ background: `hsl(${draft[variant][key]})` }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save & apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ThemeMenu;
