import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { PaletteColor } from "@/lib/color-palette";
import PaletteView from "@/components/PaletteView";
import ImageResult from "@/components/ImageResult";
import { Progress } from "@/components/ui/progress";

export type ResultState =
  | { type: "text"; content: string }
  | { type: "image"; content: string; original?: string | null; checkerBg?: boolean }
  | { type: "palette"; content: PaletteColor[] }
  | null;

interface Props {
  result: ResultState;
  loading: boolean;
  loadingMessage?: string;
  loadingProgress?: number; // 0-1
}

const ResultDisplay = ({ result, loading, loadingMessage, loadingProgress }: Props) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-muted/30 min-h-[300px] p-6">
        <p className="text-sm text-muted-foreground animate-pulse text-center">
          {loadingMessage ?? "Processing…"}
        </p>
        {loadingProgress != null && (
          <Progress value={Math.round(loadingProgress * 100)} className="w-full max-w-xs h-1.5" />
        )}
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
    return (
      <ImageResult
        imageUrl={result.content}
        originalUrl={result.original ?? null}
        showCheckerBg={result.checkerBg}
      />
    );
  }

  if (result.type === "palette") {
    return <PaletteView colors={result.content} />;
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
