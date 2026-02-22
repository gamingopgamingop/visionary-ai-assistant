import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  result: { type: "text" | "image"; content: string } | null;
  loading: boolean;
}

const ResultDisplay = ({ result, loading }: Props) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 min-h-[300px]">
        <p className="text-sm text-muted-foreground animate-pulse">Processing with AI…</p>
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
        <div className="rounded-lg border overflow-hidden">
          <img src={result.content} alt="Result" className="w-full object-contain max-h-[500px]" />
        </div>
        <Button variant="outline" size="sm" onClick={downloadImage}>
          <Download className="h-4 w-4 mr-1.5" /> Download
        </Button>
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
