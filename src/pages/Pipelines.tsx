import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Play, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import ToolErrorBoundary from "@/components/ToolErrorBoundary";
import {
  listPipelines, savePipeline, deletePipeline, newPipeline, runPipeline, OPS, OP_MAP,
  type Pipeline, type PipelineStep,
} from "@/lib/pipeline";

export default function Pipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [current, setCurrent] = useState<Pipeline | null>(null);
  const [input, setInput] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => { setPipelines(listPipelines()); }, []);

  const refresh = () => setPipelines(listPipelines());

  const create = () => {
    const p = newPipeline(`Pipeline ${pipelines.length + 1}`);
    savePipeline(p); refresh(); setCurrent(p);
  };

  const save = () => {
    if (!current) return;
    savePipeline(current); refresh();
    toast.success("Pipeline saved");
  };

  const remove = (id: string) => {
    deletePipeline(id); refresh();
    if (current?.id === id) setCurrent(null);
  };

  const addStep = (opId: string) => {
    if (!current) return;
    const op = OP_MAP[opId];
    const step: PipelineStep = { id: crypto.randomUUID(), opId, params: { ...op.defaults } };
    setCurrent({ ...current, steps: [...current.steps, step] });
  };

  const removeStep = (id: string) => {
    if (!current) return;
    setCurrent({ ...current, steps: current.steps.filter((s) => s.id !== id) });
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    if (!current) return;
    const idx = current.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= current.steps.length) return;
    const steps = [...current.steps];
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    setCurrent({ ...current, steps });
  };

  const updateParam = (stepId: string, key: string, value: any) => {
    if (!current) return;
    setCurrent({
      ...current,
      steps: current.steps.map((s) => s.id === stepId ? { ...s, params: { ...s.params, [key]: value } } : s),
    });
  };

  const run = async () => {
    if (!current || !input) { toast.error("Pick an image and pipeline first"); return; }
    setRunning(true); setOutput(null); setProgress("Starting…");
    try {
      const result = await runPipeline(
        current,
        input,
        (i, total, op) => setProgress(`Step ${i + 1}/${total}: ${op.label}`),
        (msg) => setProgress(msg),
      );
      setOutput(result);
      toast.success("Pipeline complete");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setRunning(false); setProgress(""); }
  };

  return (
    <main className="container py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Preset Pipelines</h1>
          <p className="text-muted-foreground mt-1">Chain operations into reusable presets.</p>
        </div>
        <Button onClick={create}><Plus className="h-4 w-4 mr-2" />New pipeline</Button>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Saved</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {pipelines.length === 0 && <p className="text-sm text-muted-foreground">No pipelines yet.</p>}
            {pipelines.map((p) => (
              <div key={p.id} className={`flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent ${current?.id === p.id ? "bg-accent" : ""}`}>
                <button onClick={() => setCurrent(p)} className="text-sm text-left flex-1 truncate">{p.name}</button>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <ToolErrorBoundary toolName="Pipeline editor">
          {!current ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Select or create a pipeline.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <Input
                  value={current.name}
                  onChange={(e) => setCurrent({ ...current, name: e.target.value })}
                  className="text-lg font-semibold border-0 px-0 h-9 focus-visible:ring-0 max-w-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={save}><Save className="h-4 w-4 mr-1.5" />Save</Button>
                  <Button size="sm" onClick={run} disabled={running || !input}>
                    <Play className="h-4 w-4 mr-1.5" />{running ? "Running…" : "Run"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Input image</Label>
                  <div className="mt-2">
                    <ImageUploader
                      label="Input image"
                      image={input}
                      onDrop={(file) => {
                        const r = new FileReader();
                        r.onload = () => setInput(r.result as string);
                        r.readAsDataURL(file);
                      }}
                      onClear={() => setInput(null)}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Steps</Label>
                  <div className="mt-2 space-y-2">
                    {current.steps.length === 0 && <p className="text-sm text-muted-foreground">No steps yet. Add one below.</p>}
                    {current.steps.map((step, i) => {
                      const op = OP_MAP[step.opId];
                      return (
                        <div key={step.id} className="rounded-md border p-3 flex items-start gap-3">
                          <div className="flex flex-col gap-1 pt-1">
                            <button onClick={() => moveStep(step.id, -1)} className="text-xs text-muted-foreground hover:text-foreground">▲</button>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <button onClick={() => moveStep(step.id, 1)} className="text-xs text-muted-foreground hover:text-foreground">▼</button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{i + 1}</Badge>
                              <span className="font-medium">{op?.label ?? step.opId}</span>
                              <Badge variant="outline" className="text-xs">{op?.category}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(step.params).map(([k, v]) => (
                                <div key={k}>
                                  <Label className="text-xs">{k}</Label>
                                  <Input
                                    value={String(v)}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const parsed = typeof v === "number" ? Number(raw) : raw;
                                      updateParam(step.id, k, parsed);
                                    }}
                                    className="h-8"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeStep(step.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select onValueChange={addStep}>
                    <SelectTrigger className="max-w-xs"><SelectValue placeholder="Add step…" /></SelectTrigger>
                    <SelectContent>
                      {OPS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.label} <span className="text-muted-foreground ml-2">{o.category}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {progress && <p className="text-sm text-muted-foreground">{progress}</p>}

                {output && (
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Result</Label>
                    <img src={output} alt="Pipeline output" className="mt-2 rounded-md border max-w-full" />
                    <a href={output} download="pipeline-output.png">
                      <Button size="sm" variant="outline" className="mt-2">Download</Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </ToolErrorBoundary>
      </div>
    </main>
  );
}
