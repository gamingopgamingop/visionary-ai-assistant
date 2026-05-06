import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import ResultDisplay, { type ResultState } from "@/components/ResultDisplay";
import ClerkAuth from "@/components/ClerkAuth";
import HistoryPanel from "@/components/HistoryPanel";
import PromptParams, { DEFAULT_PROMPT_PARAMS, type PromptParamsValue } from "@/components/PromptParams";
import PromptPresetPicker from "@/components/PromptPresetPicker";
import BatchBgRemove from "@/components/BatchBgRemove";
import OnnxModelPicker, { type OnnxSelection } from "@/components/OnnxModelPicker";
import FaviconPicker from "@/components/FaviconPicker";
import { ONNX_MODELS } from "@/lib/onnx-models";
import { applyWasmEffect, type WasmEffect } from "@/lib/wasm-image";
import { extractPalette } from "@/lib/color-palette";
import { editImage, type ImageFormat } from "@/lib/basic-editor";
import { addHistory, type HistoryItem } from "@/lib/history";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  Eye, ScanSearch, FileText, GitCompare, Sparkles, Eraser, Palette, Wand2, Cpu, Zap,
  Scissors, Droplet, MessageSquareQuote, Crop, Mountain, Maximize2, Smile, ShieldAlert,
  Type, Layers, Settings as SettingsIcon,
} from "lucide-react";

type TabId =
  | "analyze" | "detect" | "ocr" | "compare" | "enhance" | "inpaint" | "style" | "generate"
  | "wasm" | "onnx" | "bgRemove" | "palette" | "imageToPrompt" | "editor"
  | "depth" | "superres" | "caption" | "nsfw" | "faces" | "similarity" | "settings";

const tabs: {
  id: TabId; label: string; icon: React.ElementType;
  needsImage: boolean; needsSecondImage?: boolean; needsPrompt?: boolean;
  hasPromptParams?: boolean;
}[] = [
  { id: "analyze", label: "Analyze", icon: Eye, needsImage: true },
  { id: "detect", label: "Detect", icon: ScanSearch, needsImage: true },
  { id: "ocr", label: "OCR", icon: FileText, needsImage: true },
  { id: "compare", label: "Compare", icon: GitCompare, needsImage: true, needsSecondImage: true },
  { id: "enhance", label: "Enhance", icon: Sparkles, needsImage: true, hasPromptParams: true },
  { id: "inpaint", label: "Inpaint", icon: Eraser, needsImage: true, needsPrompt: true, hasPromptParams: true },
  { id: "style", label: "Style", icon: Palette, needsImage: true, needsPrompt: true, hasPromptParams: true },
  { id: "generate", label: "Generate", icon: Wand2, needsImage: false, needsPrompt: true, hasPromptParams: true },
  { id: "imageToPrompt", label: "Image→Prompt", icon: MessageSquareQuote, needsImage: true },
  { id: "caption", label: "Caption", icon: Type, needsImage: true },
  { id: "bgRemove", label: "BG Remove", icon: Scissors, needsImage: true },
  { id: "depth", label: "Depth", icon: Mountain, needsImage: true },
  { id: "superres", label: "Super-Res", icon: Maximize2, needsImage: true },
  { id: "faces", label: "Faces", icon: Smile, needsImage: true },
  { id: "nsfw", label: "NSFW", icon: ShieldAlert, needsImage: true },
  { id: "similarity", label: "Similarity", icon: Layers, needsImage: true },
  { id: "palette", label: "Palette", icon: Droplet, needsImage: true },
  { id: "wasm", label: "WASM FX", icon: Zap, needsImage: true },
  { id: "onnx", label: "ONNX AI", icon: Cpu, needsImage: true },
  { id: "editor", label: "Editor", icon: Crop, needsImage: true },
  { id: "settings", label: "Settings", icon: SettingsIcon, needsImage: false },
];

const wasmEffects: { value: WasmEffect; label: string }[] = [
  { value: "grayscale", label: "Grayscale" },
  { value: "blur", label: "Gaussian Blur" },
  { value: "sharpen", label: "Sharpen" },
  { value: "brighten", label: "Brighten" },
  { value: "contrast", label: "Contrast" },
  { value: "sepia", label: "Sepia" },
  { value: "invert", label: "Invert" },
  { value: "flipH", label: "Flip Horizontal" },
  { value: "flipV", label: "Flip Vertical" },
  { value: "solarize", label: "Solarize" },
  { value: "emboss", label: "Emboss" },
];

const Workspace = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = usePersistedState<TabId>("ait_ws_tab", "analyze");
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<ResultState>(null);
  const [wasmEffect, setWasmEffect] = usePersistedState<WasmEffect>("ait_ws_wasm", "grayscale");
  const [promptParams, setPromptParams] = usePersistedState<PromptParamsValue>("ait_ws_params", DEFAULT_PROMPT_PARAMS);
  const [historyKey, setHistoryKey] = useState(0);
  const [onnxSel, setOnnxSel] = useState<OnnxSelection>({
    path: ONNX_MODELS[0].path,
    inputName: ONNX_MODELS[0].inputName,
    inputShape: ONNX_MODELS[0].inputShape,
    label: ONNX_MODELS[0].label,
  });
  const [gallery, setGallery] = usePersistedState<string[]>("ait_ws_sim_gallery", []);
  const [similarityRanked, setSimilarityRanked] = useState<{ url: string; sim: number }[]>([]);
  const [simSort, setSimSort] = usePersistedState<"desc" | "asc">("ait_ws_sim_sort", "desc");
  const FACE_MODELS = [
    { value: "Xenova/yolos-tiny", label: "YOLOS-tiny (general)" },
    { value: "Xenova/detr-resnet-50", label: "DETR ResNet-50 (accurate)" },
    { value: "Xenova/yolos-small", label: "YOLOS-small (balanced)" },
  ];
  const [faceModel, setFaceModel] = usePersistedState<string>("ait_ws_face_model", FACE_MODELS[0].value);
  const [faceThresholds, setFaceThresholds] = usePersistedState<Record<string, number>>("ait_ws_face_thresh_v2", {});
  const faceThreshold = faceThresholds[faceModel] ?? 0.5;
  const setFaceThreshold = (v: number) => setFaceThresholds((m) => ({ ...m, [faceModel]: v }));
  const [faceBoxes, setFaceBoxes] = useState<any[]>([]);
  const [faceLabels, setFaceLabels] = useState<Record<number, string>>({});
  const [faceImageDims, setFaceImageDims] = useState<{ w: number; h: number } | null>(null);

  // Editor controls (persisted)
  const [editWidth, setEditWidth] = usePersistedState<string>("ait_ws_edit_w", "");
  const [editHeight, setEditHeight] = usePersistedState<string>("ait_ws_edit_h", "");
  const [editRotate, setEditRotate] = usePersistedState<"0" | "90" | "180" | "270">("ait_ws_edit_rot", "0");
  const [editFormat, setEditFormat] = usePersistedState<ImageFormat>("ait_ws_edit_fmt", "image/png");
  const [editQuality, setEditQuality] = usePersistedState<string>("ait_ws_edit_q", "0.9");

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageDrop = useCallback(async (file: File, slot: 1 | 2) => {
    const base64 = await fileToBase64(file);
    if (slot === 1) setImage1(base64);
    else setImage2(base64);
  }, []);

  const saveToHistory = async (
    tool: TabId,
    toolLabel: string,
    res: NonNullable<ResultState>,
  ) => {
    const fullResult =
      res.type === "palette"
        ? JSON.stringify(res.content.map((c) => c.hex))
        : res.content;
    await addHistory({
      tool,
      toolLabel,
      resultType: res.type,
      fullResult,
      prompt: prompt || undefined,
    });
    setHistoryKey((k) => k + 1);
  };

  const handleProcess = async () => {
    setLoading(true);
    setLoadingMsg("Processing…");
    setLoadingProgress(undefined);
    setResult(null);
    try {
      let res: NonNullable<ResultState> | null = null;

      if (activeTab === "wasm") {
        if (!image1) throw new Error("Upload an image first");
        const start = performance.now();
        const out = await applyWasmEffect(image1, wasmEffect);
        toast.success(`WASM processed in ${Math.round(performance.now() - start)}ms`);
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "onnx") {
        if (!image1) throw new Error("Upload an image first");
        if (!onnxSel.path) throw new Error("Select or provide an ONNX model");
        setLoadingMsg(`Loading ${onnxSel.label}…`);
        setLoadingProgress(0);
        const { classifyImage } = await import("@/lib/onnx-inference");
        const start = performance.now();
        const predictions = await classifyImage(
          image1, onnxSel.path, onnxSel.inputName, onnxSel.inputShape,
          (p) => {
            setLoadingMsg(p.message);
            if (p.total > 0) setLoadingProgress(p.loaded / p.total);
          },
        );
        const elapsed = Math.round(performance.now() - start);
        const text = predictions
          .map((p, i) => `${i + 1}. ${p.label} — ${(p.score * 100).toFixed(1)}%`)
          .join("\n");
        toast.success(`ONNX inference in ${elapsed}ms`);
        res = {
          type: "text",
          content: `ONNX Runtime Web — ${onnxSel.label}\nProcessed in ${elapsed}ms\n\nTop predictions:\n${text}`,
        };
      } else if (activeTab === "depth") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading depth model…");
        setLoadingProgress(0);
        const { estimateDepth } = await import("@/lib/extra-services");
        const out = await estimateDepth(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        });
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "superres") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading upscaler…");
        setLoadingProgress(0);
        const { superResolve } = await import("@/lib/extra-services");
        const out = await superResolve(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        });
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "caption") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading captioner…");
        setLoadingProgress(0);
        const { captionImage } = await import("@/lib/extra-services");
        const text = await captionImage(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        });
        res = { type: "text", content: text };
      } else if (activeTab === "nsfw") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading NSFW classifier…");
        setLoadingProgress(0);
        const { nsfwCheck } = await import("@/lib/extra-services");
        const out = await nsfwCheck(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        });
        const text = out.map((o, i) => `${i + 1}. ${o.label} — ${(o.score * 100).toFixed(1)}%`).join("\n");
        res = { type: "text", content: `NSFW classification:\n${text}` };
      } else if (activeTab === "faces") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading detector…");
        setLoadingProgress(0);
        const { detectFaces } = await import("@/lib/extra-services");
        const { drawBoxesOnImage } = await import("@/lib/draw-boxes");
        const out = await detectFaces(image1, faceThreshold, faceModel, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        });
        // Capture original image dims for metadata
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const im = new Image();
          im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
          im.src = image1;
        });
        setFaceImageDims(dims);
        setFaceBoxes(out);
        setFaceLabels({});
        if (!out.length) {
          res = { type: "text", content: "No detections above threshold." };
        } else {
          const annotated = await drawBoxesOnImage(image1, out);
          const summary = out.map((o, i) => `${i + 1}. ${o.label} — ${(o.score * 100).toFixed(0)}%`).join("\n");
          toast.success(`Detected ${out.length} object(s)`);
          res = { type: "image", content: annotated, original: image1 };
          await saveToHistory("faces", "Faces", { type: "text", content: summary });
        }
      } else if (activeTab === "similarity") {
        if (!image1) throw new Error("Upload a query image first");
        if (!gallery.length && !image2) throw new Error("Add gallery images or a second image");
        setLoadingMsg("Loading embedder…");
        setLoadingProgress(0);
        const { embedImage, cosineSimilarity } = await import("@/lib/extra-services");
        const targets = gallery.length ? gallery : [image2!];
        const a = await embedImage(image1, ({ progress, message }) => {
          setLoadingMsg(`Query: ${message}`);
          setLoadingProgress(progress / (targets.length + 1));
        });
        const sims: { idx: number; sim: number }[] = [];
        for (let i = 0; i < targets.length; i++) {
          const b = await embedImage(targets[i], ({ progress, message }) => {
            setLoadingMsg(`Image ${i + 1}/${targets.length}: ${message}`);
            setLoadingProgress((1 + i + progress) / (targets.length + 1));
          });
          sims.push({ idx: i, sim: cosineSimilarity(a, b) });
        }
        sims.sort((x, y) => simSort === "desc" ? y.sim - x.sim : x.sim - y.sim);
        const text = sims
          .map((s, rank) => `#${rank + 1} — image ${s.idx + 1}: ${(s.sim * 100).toFixed(2)}%`)
          .join("\n");
        setSimilarityRanked(sims.map((s) => ({ url: targets[s.idx], sim: s.sim })));
        res = { type: "text", content: `Cosine similarity ranking:\n${text}` };
      } else if (activeTab === "bgRemove") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Preparing background removal…");
        setLoadingProgress(0);
        const { removeBackground } = await import("@/lib/bg-remove");
        const start = performance.now();
        const out = await removeBackground(image1, ({ stage, progress, message }) => {
          const labels = {
            "loading-model": "Downloading model",
            "segmenting": "Detecting subject",
            "compositing": "Compositing",
          } as const;
          setLoadingMsg(message || labels[stage]);
          setLoadingProgress(progress);
        });
        toast.success(`Background removed in ${Math.round(performance.now() - start)}ms`);
        res = { type: "image", content: out, original: image1, checkerBg: true };
      } else if (activeTab === "palette") {
        if (!image1) throw new Error("Upload an image first");
        const colors = await extractPalette(image1, 8);
        res = { type: "palette", content: colors };
      } else if (activeTab === "editor") {
        if (!image1) throw new Error("Upload an image first");
        const out = await editImage(image1, {
          width: editWidth ? parseInt(editWidth) : undefined,
          height: editHeight ? parseInt(editHeight) : undefined,
          rotate: parseInt(editRotate) as 0 | 90 | 180 | 270,
          format: editFormat,
          quality: parseFloat(editQuality),
        });
        toast.success("Image processed");
        res = { type: "image", content: out, original: image1 };
      } else {
        // Server-side AI
        const body: Record<string, unknown> = { action: activeTab };
        if (image1) body.image1 = image1;
        if (image2) body.image2 = image2;
        if (prompt) body.prompt = prompt;
        if (currentTab.hasPromptParams) body.params = promptParams;

        setLoadingMsg("Calling AI…");
        const { data, error } = await supabase.functions.invoke("image-ai", { body });
        if (error) throw error;

        if (data.resultImage) {
          res = { type: "image", content: data.resultImage, original: image1 };
        } else {
          res = { type: "text", content: data.resultText };
        }
      }

      if (res) {
        setResult(res);
        await saveToHistory(activeTab, currentTab.label, res);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingProgress(undefined);
    }
  };

  const resetState = () => {
    setImage1(null);
    setImage2(null);
    setPrompt("");
    setResult(null);
    setSimilarityRanked([]);
  };

  const handleRestore = (item: HistoryItem) => {
    // Switch to the originating tool and restore the result
    setActiveTab(item.tool as TabId);
    if (item.resultType === "image") {
      setResult({ type: "image", content: item.fullResult });
    } else if (item.resultType === "text") {
      setResult({ type: "text", content: item.fullResult });
    } else if (item.resultType === "palette") {
      try {
        const hexes: string[] = JSON.parse(item.fullResult);
        setResult({
          type: "palette",
          content: hexes.map((hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { hex, rgb: [r, g, b], count: 1 };
          }),
        });
      } catch {
        /* ignore */
      }
    }
    if (item.prompt) setPrompt(item.prompt);
    toast.success(`Restored: ${item.toolLabel}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="text-sm font-semibold tracking-tight hover:opacity-70">
            AI Image Toolkit
          </button>
          <div className="flex items-center gap-2">
            <HistoryPanel refreshKey={historyKey} onRestore={handleRestore} />
            <ClerkAuth />
          </div>
        </div>
      </header>

      <div className="container flex-1 py-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as TabId);
            resetState();
          }}
        >
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  {t.needsImage && (
                    <ImageUploader
                      label={t.needsSecondImage ? "Image 1" : "Upload Image"}
                      image={image1}
                      onDrop={(f) => handleImageDrop(f, 1)}
                      onClear={() => setImage1(null)}
                    />
                  )}
                  {t.needsSecondImage && (
                    <ImageUploader
                      label="Image 2"
                      image={image2}
                      onDrop={(f) => handleImageDrop(f, 2)}
                      onClear={() => setImage2(null)}
                    />
                  )}
                  {t.needsPrompt && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Prompt</Label>
                        {(t.id === "generate" || t.id === "style" || t.id === "inpaint" || t.id === "enhance") && (
                          <PromptPresetPicker tool={t.id} onPick={(p) => setPrompt(p)} />
                        )}
                      </div>
                      <Textarea
                        placeholder={
                          t.id === "generate"
                            ? "Describe the image you want to generate…"
                            : t.id === "style"
                              ? 'Describe the style focus, e.g. "warm golden hour"…'
                              : "Describe what to fix or fill in…"
                        }
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}

                  {t.hasPromptParams && (
                    <PromptParams value={promptParams} onChange={setPromptParams} />
                  )}

                  {t.id === "wasm" && (
                    <Select value={wasmEffect} onValueChange={(v) => setWasmEffect(v as WasmEffect)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose effect" />
                      </SelectTrigger>
                      <SelectContent>
                        {wasmEffects.map((e) => (
                          <SelectItem key={e.value} value={e.value}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {t.id === "onnx" && (
                    <div className="space-y-2">
                      <OnnxModelPicker onChange={setOnnxSel} />
                      <p className="text-xs text-muted-foreground">
                        Runs in-browser via ONNX Runtime Web (WASM). Drop bundled models in <code>public/models/</code>, paste a URL, or upload a <code>.onnx</code> file.
                      </p>
                    </div>
                  )}

                  {t.id === "faces" && (
                    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Confidence threshold</Label>
                        <span className="text-xs font-mono text-muted-foreground">{(faceThreshold * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[faceThreshold * 100]}
                        min={10}
                        max={95}
                        step={1}
                        onValueChange={([v]) => setFaceThreshold(v / 100)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Lower = more detections. Result image is annotated and downloadable via the Export menu.
                      </p>
                    </div>
                  )}

                  {t.id === "similarity" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          Gallery {gallery.length > 0 && <span className="text-foreground">({gallery.length})</span>}
                        </Label>
                        {gallery.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => { setGallery([]); setSimilarityRanked([]); }}
                          >
                            Clear all
                          </Button>
                        )}
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          const urls = await Promise.all(files.map(fileToBase64));
                          setGallery((g) => [...g, ...urls]);
                          e.target.value = "";
                        }}
                      />
                      {gallery.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {gallery.map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt={`Gallery ${i + 1}`} className="w-full aspect-square object-cover rounded border" />
                              <div className="absolute inset-x-0.5 top-0.5 flex justify-between opacity-0 group-hover:opacity-100">
                                <div className="flex gap-0.5">
                                  <button
                                    disabled={i === 0}
                                    onClick={() => setGallery((g) => {
                                      const n = [...g];[n[i - 1], n[i]] = [n[i], n[i - 1]]; return n;
                                    })}
                                    className="rounded bg-background/90 px-1 text-[10px] border disabled:opacity-30"
                                  >‹</button>
                                  <button
                                    disabled={i === gallery.length - 1}
                                    onClick={() => setGallery((g) => {
                                      const n = [...g];[n[i + 1], n[i]] = [n[i], n[i + 1]]; return n;
                                    })}
                                    className="rounded bg-background/90 px-1 text-[10px] border disabled:opacity-30"
                                  >›</button>
                                </div>
                                <button
                                  onClick={() => setGallery((g) => g.filter((_, j) => j !== i))}
                                  className="rounded bg-background/90 px-1 text-[10px] border"
                                >✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {similarityRanked.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium">Ranked results</p>
                          <div className="grid grid-cols-3 gap-2">
                            {similarityRanked.map((r, i) => (
                              <div key={i} className="space-y-1">
                                <img src={r.url} alt={`Rank ${i + 1}`} className="w-full aspect-square object-cover rounded border" />
                                <p className="text-[11px] text-center">#{i + 1} — {(r.sim * 100).toFixed(1)}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Gallery persists across sessions. If empty, a single second image is used instead.
                      </p>
                      {gallery.length === 0 && (
                        <ImageUploader
                          label="Image 2 (optional)"
                          image={image2}
                          onDrop={(f) => handleImageDrop(f, 2)}
                          onClear={() => setImage2(null)}
                        />
                      )}
                    </div>
                  )}

                  {t.id === "bgRemove" && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Single image uses RMBG-1.4 with WebGPU. Use the batch panel below for multi-image jobs with custom model + size.
                      </p>
                      <div className="rounded-md border p-3 bg-muted/30">
                        <p className="text-xs font-medium mb-2">Batch background removal</p>
                        <BatchBgRemove />
                      </div>
                    </div>
                  )}

                  {t.id === "palette" && (
                    <p className="text-xs text-muted-foreground">
                      Extracts the 8 most dominant colors. Click swatches to copy hex, or export as CSS / JSON.
                    </p>
                  )}

                  {t.id === "editor" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Width (px)</Label>
                        <Input value={editWidth} onChange={(e) => setEditWidth(e.target.value)} placeholder="auto" />
                      </div>
                      <div>
                        <Label className="text-xs">Height (px)</Label>
                        <Input value={editHeight} onChange={(e) => setEditHeight(e.target.value)} placeholder="auto" />
                      </div>
                      <div>
                        <Label className="text-xs">Rotate</Label>
                        <Select value={editRotate} onValueChange={(v) => setEditRotate(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0°</SelectItem>
                            <SelectItem value="90">90°</SelectItem>
                            <SelectItem value="180">180°</SelectItem>
                            <SelectItem value="270">270°</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Format</Label>
                        <Select value={editFormat} onValueChange={(v) => setEditFormat(v as ImageFormat)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image/png">PNG</SelectItem>
                            <SelectItem value="image/jpeg">JPEG</SelectItem>
                            <SelectItem value="image/webp">WebP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quality (0–1, JPEG/WebP)</Label>
                        <Input value={editQuality} onChange={(e) => setEditQuality(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {t.id === "settings" && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Favicon</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Choose a preset, upload your own image, or reset to default. Saved per browser.
                        </p>
                        <FaviconPicker />
                      </div>
                      <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                        <p className="text-xs font-medium mb-1">ONNX & model caches</p>
                        <p className="text-[11px] text-muted-foreground mb-2">
                          Strong clear: drops in-memory sessions, deletes our IndexedDB store, removes Transformers.js / HuggingFace IndexedDB caches, and purges related CacheStorage entries.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { clearOnnxCache } = await import("@/lib/onnx-loader");
                              const r = await clearOnnxCache();
                              toast.success(
                                `Cleared: ${r.sessionsCleared} session(s), IDB ${r.idbCleared ? "✓" : "✗"}, Transformers ${r.transformersCleared ? "✓" : "✗"}, ${r.cachesCleared} CacheStorage`,
                              );
                            }}
                          >
                            Clear all model caches
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (!confirm("Hard reset: clear all model caches AND reload the page?")) return;
                              const { clearOnnxCache } = await import("@/lib/onnx-loader");
                              await clearOnnxCache();
                              location.reload();
                            }}
                          >
                            Hard reset & reload
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {t.id !== "settings" && (
                    <>
                      <Button
                        onClick={handleProcess}
                        disabled={
                          loading ||
                          (t.needsImage && !image1) ||
                          (t.needsSecondImage && !image2) ||
                          (t.needsPrompt && !t.needsImage && !prompt)
                        }
                        className="w-full"
                      >
                        {loading ? "Processing…" : `Run ${t.label}`}
                      </Button>

                      {loading && loadingProgress == null && (
                        <Progress value={undefined} className="h-1.5 animate-pulse" />
                      )}
                    </>
                  )}
                </div>

                {t.id !== "settings" && (
                  <ResultDisplay
                    result={result}
                    loading={loading}
                    loadingMessage={loadingMsg}
                    loadingProgress={loadingProgress}
                  />
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Workspace;
