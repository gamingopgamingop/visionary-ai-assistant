import { useState } from "react";
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
import { usePersistedState } from "@/hooks/use-persisted-state";

interface BatchItem {
  name: string;
  src: string;
  out?: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number; // 0-1 per file
  stage?: string;
  error?: string;
}

const MODELS: { value: BgModelId; label: string; note: string }[] = [
  { value: "briaai/RMBG-1.4", label: "RMBG-1.4", note: "Default — accurate, ~80MB" },
  { value: "Xenova/modnet", label: "MODNet", note: "Faster, portrait-focused" },
];

const BatchBgRemove = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [model, setModel] = usePersistedState<BgModelId>("ait_batch_model", "briaai/RMBG-1.4");
  const [maxDim, setMaxDim] = usePersistedState<string>("ait_batch_maxdim", "1024");
  const [useWebGPU, setUseWebGPU] = usePersistedState<boolean>("ait_batch_webgpu", true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: BatchItem[] = [];
    for (const f of Array.from(files)) {
      const src = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      });
      next.push({ name: f.name, src, status: "pending" });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const runBatch = async () => {
    if (!items.length) return;
    setRunning(true);
    setProgress(0);

    try {
      const dim = Math.max(256, Math.min(2048, parseInt(maxDim) || 1024));
      let done = 0;
      for (let i = 0; i < items.length; i++) {
        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: "running" } : it)),
        );
        try {
          const out = await removeBackgroundBatch(items[i].src, {
            model,
            maxDim: dim,
            useWebGPU,
            onProgress: ({ message, progress: p, stage }) => {
              setProgressMsg(`(${i + 1}/${items.length}) ${message ?? ""}`);
              setProgress(((done + (p ?? 0)) / items.length) * 100);
              setItems((prev) =>
                prev.map((it, idx) =>
                  idx === i ? { ...it, progress: p, stage } : it,
                ),
              );
            },
          });
          setItems((prev) =>
            prev.map((it, idx) => (idx === i ? { ...it, out, status: "done", progress: 1 } : it)),
          );
        } catch (e: any) {
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i ? { ...it, status: "error", error: e.message } : it,
            ),
          );
        }
        done += 1;
        setProgress((done / items.length) * 100);
      }
      toast.success(`Processed ${items.length} image${items.length > 1 ? "s" : ""}`);
    } finally {
      setRunning(false);
      setProgressMsg("");
    }
  };

  const downloadAll = () => {
    items.forEach((it, i) => {
      if (!it.out) return;
      const a = document.createElement("a");
      a.href = it.out;
      a.download = it.name.replace(/\.[^.]+$/, "") + "-nobg.png";
      a.click();
      // Stagger to avoid browser throttling
      if (i < items.length - 1) {
        // no-op, browsers usually handle sequential clicks fine
      }
    });
  };

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
        <ul className="space-y-1 max-h-56 overflow-auto rounded-md border p-2">
          {items.map((it, i) => (
            <li key={i} className="flex flex-col gap-1 text-xs p-1 rounded hover:bg-muted/40">
              <div className="flex items-center gap-2">
                <img src={it.out ?? it.src} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded object-cover bg-muted" />
                <span className="flex-1 truncate">{it.name}</span>
                <span className={
                  it.status === "done" ? "text-emerald-600" :
                  it.status === "running" ? "text-primary" :
                  it.status === "error" ? "text-destructive" :
                  "text-muted-foreground"
                }>
                  {it.status}
                </span>
                {!running && (
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-foreground" aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {it.status === "running" && (
                <div className="pl-10 space-y-0.5">
                  <Progress value={(it.progress ?? 0) * 100} className="h-1" />
                  {it.stage && <p className="text-[10px] text-muted-foreground">{it.stage}</p>}
                </div>
              )}
              {it.status === "error" && it.error && (
                <p className="pl-10 text-[10px] text-destructive">{it.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {running && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{progressMsg}</p>
        </div>
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
