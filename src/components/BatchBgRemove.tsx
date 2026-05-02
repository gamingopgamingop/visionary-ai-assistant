import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, Upload, X } from "lucide-react";
import { removeBackgroundBatch, type BgModelId } from "@/lib/bg-remove";
import { loadSettings, patchSettings } from "@/lib/workspace-settings";

interface BatchItem {
  name: string;
  src: string;
  out?: string;
  status: "pending" | "running" | "done" | "error";
  progress: number; // 0-100
  message?: string;
  error?: string;
}

const MODELS: { value: BgModelId; label: string; note: string }[] = [
  { value: "briaai/RMBG-1.4", label: "RMBG-1.4", note: "Default — accurate, ~80MB" },
  { value: "Xenova/modnet", label: "MODNet", note: "Faster, portrait-focused" },
];

const BatchBgRemove = () => {
  const persisted = loadSettings().batchBg;
  const [items, setItems] = useState<BatchItem[]>([]);
  const [model, setModel] = useState<BgModelId>(persisted.model as BgModelId);
  const [maxDim, setMaxDim] = useState(persisted.maxDim);
  const [useWebGPU, setUseWebGPU] = useState(persisted.useWebGPU);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    patchSettings({ batchBg: { model, maxDim, useWebGPU } });
  }, [model, maxDim, useWebGPU]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: BatchItem[] = [];
    for (const f of Array.from(files)) {
      const src = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      });
      next.push({ name: f.name, src, status: "pending", progress: 0 });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, patch: Partial<BatchItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const runBatch = async () => {
    if (!items.length) return;
    setRunning(true);
    try {
      const dim = Math.max(256, Math.min(2048, parseInt(maxDim) || 1024));
      for (let i = 0; i < items.length; i++) {
        if (items[i].status === "done") continue;
        updateItem(i, { status: "running", progress: 0, message: "Starting…" });
        try {
          const out = await removeBackgroundBatch(items[i].src, {
            model,
            maxDim: dim,
            useWebGPU,
            onProgress: ({ message, progress }) => {
              updateItem(i, { progress: Math.round((progress ?? 0) * 100), message });
            },
          });
          updateItem(i, { out, status: "done", progress: 100, message: "Done" });
        } catch (e: any) {
          updateItem(i, { status: "error", error: e.message, message: e.message });
        }
      }
      toast.success(`Processed ${items.length} image${items.length > 1 ? "s" : ""}`);
    } finally {
      setRunning(false);
    }
  };

  const downloadAll = () => {
    items.forEach((it) => {
      if (!it.out) return;
      const a = document.createElement("a");
      a.href = it.out;
      a.download = it.name.replace(/\.[^.]+$/, "") + "-nobg.png";
      a.click();
    });
  };

  const overallDone = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Model</Label>
          <Select value={model} onValueChange={(v) => setModel(v as BgModelId)} disabled={running}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex flex-col">
                    <span>{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">{m.note}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Max dimension (px)</Label>
          <Input
            value={maxDim}
            onChange={(e) => setMaxDim(e.target.value)}
            disabled={running}
            placeholder="1024"
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Switch checked={useWebGPU} onCheckedChange={setUseWebGPU} disabled={running} />
          <Label className="text-xs">Use WebGPU when available</Label>
        </div>
      </div>

      <label className="flex items-center justify-center gap-2 border border-dashed rounded-md py-4 text-sm cursor-pointer hover:bg-muted/40 transition-colors">
        <Upload className="h-4 w-4" />
        Add images…
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>

      {items.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-auto rounded-md border p-2">
          {items.map((it, i) => (
            <li key={i} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <img src={it.out ?? it.src} alt="" className="h-8 w-8 rounded object-cover bg-muted" />
                <span className="flex-1 truncate">{it.name}</span>
                <span className={
                  it.status === "done" ? "text-emerald-600" :
                  it.status === "running" ? "text-primary" :
                  it.status === "error" ? "text-destructive" :
                  "text-muted-foreground"
                }>
                  {it.status === "running" ? `${it.progress}%` : it.status}
                </span>
                {!running && (
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {(it.status === "running" || it.status === "done") && (
                <div className="space-y-0.5 pl-10">
                  <Progress value={it.progress} className="h-1" />
                  {it.message && it.status === "running" && (
                    <p className="text-[10px] text-muted-foreground truncate">{it.message}</p>
                  )}
                </div>
              )}
              {it.status === "error" && (
                <p className="text-[10px] text-destructive pl-10 truncate">{it.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {overallDone} / {items.length} complete
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={runBatch} disabled={running || items.length === 0} className="flex-1">
          {running ? "Processing…" : `Run batch (${items.length})`}
        </Button>
        <Button
          variant="outline"
          onClick={downloadAll}
          disabled={running || !items.some((i) => i.out)}
        >
          <Download className="h-4 w-4 mr-1.5" /> Download all
        </Button>
      </div>
    </div>
  );
};

export default BatchBgRemove;
