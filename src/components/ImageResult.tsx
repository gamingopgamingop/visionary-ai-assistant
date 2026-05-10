import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Download, Eye, EyeOff, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import { downloadAs, type ExportFormat } from "@/lib/export-image";

interface Props {
  imageUrl: string;
  originalUrl?: string | null;
  showCheckerBg?: boolean;
}

const ImageResult = ({ imageUrl, originalUrl, showCheckerBg }: Props) => {
  const [quality, setQuality] = useState(0.92);
  const [showOriginal, setShowOriginal] = useState(false);
  const [lockedOriginal, setLockedOriginal] = useState(false);
  const visibleOriginal = lockedOriginal || showOriginal;

  const doDownload = (format: ExportFormat) => downloadAs(imageUrl, format, quality);

  const checker = showCheckerBg
    ? "bg-[conic-gradient(at_50%_50%,_hsl(var(--muted))_25%,_hsl(var(--background))_25%_50%,_hsl(var(--muted))_50%_75%,_hsl(var(--background))_75%)] [background-size:20px_20px]"
    : "";

  return (
    <div className="space-y-3">
      <div className={`relative rounded-lg border overflow-hidden ${checker}`}>
        <img
          src={visibleOriginal && originalUrl ? originalUrl : imageUrl}
          alt={visibleOriginal ? "Original" : "Result"}
          className="w-full object-contain max-h-[500px]"
        />
        {originalUrl && (
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            <button
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              className="inline-flex items-center gap-1.5 rounded-md bg-background/90 backdrop-blur px-2.5 py-1 text-xs border shadow-sm"
            >
              {visibleOriginal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              Hold for original
            </button>
            <button
              onClick={() => setLockedOriginal((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md bg-background/90 backdrop-blur px-2.5 py-1 text-xs border shadow-sm"
            >
              {lockedOriginal ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
              {lockedOriginal ? "Showing original" : "Showing result"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" /> Export
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Format</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => doDownload("png")}>PNG (lossless)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => doDownload("jpeg")}>JPEG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => doDownload("webp")}>WebP</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Quality (JPEG/WebP): {Math.round(quality * 100)}%
              </p>
              <Slider
                value={[quality * 100]}
                min={30}
                max={100}
                step={1}
                onValueChange={([v]) => setQuality(v / 100)}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ImageResult;
