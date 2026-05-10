import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { rgbToHsl, readableTextColor } from "@/lib/color-utils";
import type { PaletteColor } from "@/lib/color-palette";

interface Props {
  colors: PaletteColor[];
}

const PaletteView = ({ colors }: Props) => {
  const total = colors.reduce((s, c) => s + c.count, 0) || 1;

  const copy = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label ?? text}`);
  };

  const exportCss = () => {
    const css = `:root {\n${colors
      .map((c, i) => `  --palette-${i + 1}: ${c.hex};`)
      .join("\n")}\n}`;
    copy(css, "CSS variables");
  };

  const exportJson = () => {
    const json = JSON.stringify(
      colors.map((c) => ({ hex: c.hex, rgb: c.rgb.map(Math.round) })),
      null,
      2
    );
    copy(json, "JSON");
  };

  return (
    <div className="space-y-4">
      {/* Proportional bar */}
      <div className="flex h-32 rounded-lg border overflow-hidden">
        {colors.map((c) => {
          const pct = (c.count / total) * 100;
          const text = readableTextColor(c.rgb[0], c.rgb[1], c.rgb[2]);
          return (
            <button
              key={c.hex}
              style={{ background: c.hex, width: `${pct}%`, color: text }}
              onClick={() => copy(c.hex)}
              className="flex flex-col items-center justify-end pb-2 text-[10px] font-mono transition-transform hover:scale-y-105 origin-bottom"
              title={`${c.hex} — ${pct.toFixed(1)}%`}
            >
              {pct > 8 && <span>{pct.toFixed(0)}%</span>}
            </button>
          );
        })}
      </div>

      {/* Detail grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {colors.map((c) => {
          const [r, g, b] = c.rgb.map(Math.round);
          const [h, s, l] = rgbToHsl(r, g, b);
          return (
            <div key={c.hex} className="flex items-center gap-3 rounded-md border p-2">
              <button
                onClick={() => copy(c.hex)}
                className="h-12 w-12 shrink-0 rounded border"
                style={{ background: c.hex }}
                aria-label={`Copy ${c.hex}`}
              />
              <div className="min-w-0 flex-1 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium">{c.hex}</span>
                  <button
                    onClick={() => copy(c.hex)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-muted-foreground font-mono">
                  rgb({r}, {g}, {b})
                </p>
                <p className="text-muted-foreground font-mono">
                  hsl({h}, {s}%, {l}%)
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={exportCss}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Copy as CSS
        </Button>
        <Button variant="outline" size="sm" onClick={exportJson}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Copy as JSON
        </Button>
      </div>
    </div>
  );
};

export default PaletteView;
