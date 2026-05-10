import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, RotateCcw, Check } from "lucide-react";
import {
  FAVICON_PRESETS, setStoredFavicon, clearStoredFavicon,
} from "@/lib/favicon";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { toast } from "sonner";

const FaviconPicker = () => {
  const [current, setCurrent] = usePersistedState<string>("ait_favicon", FAVICON_PRESETS[0].href);
  const [uploading, setUploading] = useState(false);

  const pick = (href: string) => {
    setCurrent(href);
    setStoredFavicon(href);
    toast.success("Favicon updated");
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Image must be under 1MB");
      return;
    }
    setUploading(true);
    try {
      // Resize to 256x256 for icon use
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      const scale = Math.min(256 / img.width, 256 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (256 - w) / 2, (256 - h) / 2, w, h);
      const out = canvas.toDataURL("image/png");
      pick(out);
    } catch (e: any) {
      toast.error(e.message || "Failed to set favicon");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setCurrent(FAVICON_PRESETS[0].href);
    clearStoredFavicon();
    toast.success("Favicon reset");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Choose a preset</Label>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {FAVICON_PRESETS.map((p) => {
            const active = current === p.href;
            return (
              <button
                key={p.id}
                onClick={() => pick(p.href)}
                className={`relative rounded-md border p-2 hover:bg-muted/40 transition-colors ${
                  active ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
                title={p.label}
              >
                <img src={p.href} alt={p.label} className="h-10 w-10 mx-auto object-contain" />
                <p className="text-[10px] mt-1 truncate">{p.label}</p>
                {active && (
                  <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs">Or upload your own</Label>
        <label className="flex items-center justify-center gap-2 border border-dashed rounded-md py-3 text-xs cursor-pointer hover:bg-muted/40 mt-1">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Processing…" : "Upload image (PNG/JPG, ≤1MB)"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <Button variant="outline" size="sm" onClick={reset} className="w-full">
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset to default
      </Button>
    </div>
  );
};

export default FaviconPicker;
