import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
import type { PaletteColor } from "@/lib/color-palette";

interface Props {
  result:
    | { type: "text"; content: string }
    | { type: "image"; content: string }
    | { type: "palette"; content: PaletteColor[] }
    | null;
  loading: boolean;
}

const ResultDisplay = ({ result, loading }: Props) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 min-h-[300px]">
        <p className="text-sm text-muted-foreground animate-pulse">Processing…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 min-h-[300px]">
        <p className="text-sm text-muted-foreground">Results will appear here</p>
      </div>
    );
  }

  if (result.type === "image") {
    const downloadImage = () => {
      const a = document.createElement("a");
      a.href = result.content;
      a.download = "result.png";
      a.click();
    };

    return (
      <div className="space-y-3">
        <div className="rounded-lg border overflow-hidden bg-[conic-gradient(at_50%_50%,_#f3f4f6_25%,_#ffffff_25%_50%,_#f3f4f6_50%_75%,_#ffffff_75%)] [background-size:20px_20px]">
          <img src={result.content} alt="Result" className="w-full object-contain max-h-[500px]" />
        </div>
        <Button variant="outline" size="sm" onClick={downloadImage}>
          <Download className="h-4 w-4 mr-1.5" /> Download
        </Button>
      </div>
    );
  }

  if (result.type === "palette") {
    const copyHex = (hex: string) => {
      navigator.clipboard.writeText(hex);
      toast.success(`Copied ${hex}`);
    };
    return (
      <div className="space-y-3">
        <div className="rounded-lg border overflow-hidden flex h-32">
          {result.content.map((c) => (
            <div
              key={c.hex}
              className="flex-1 cursor-pointer transition-transform hover:scale-105"
              style={{ background: c.hex }}
              onClick={() => copyHex(c.hex)}
              title={c.hex}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {result.content.map((c) => (
            <button
              key={c.hex}
              onClick={() => copyHex(c.hex)}
              className="flex items-center gap-2 rounded-md border p-2 text-left hover:bg-muted/50"
            >
              <span className="h-6 w-6 rounded border" style={{ background: c.hex }} />
              <span className="text-xs font-mono">{c.hex}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const copyText = () => {
    navigator.clipboard.writeText(result.content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-3">
      <ScrollArea className="rounded-lg border bg-muted/30 p-4 max-h-[500px]">
        <pre className="whitespace-pre-wrap text-sm">{result.content}</pre>
      </ScrollArea>
      <Button variant="outline" size="sm" onClick={copyText}>
        <Copy className="h-4 w-4 mr-1.5" /> Copy
      </Button>
    </div>
  );
};

export default ResultDisplay;
