import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import ResultDisplay, { type ResultState } from "@/components/ResultDisplay";
import ClerkAuth from "@/components/ClerkAuth";
import HistoryPanel from "@/components/HistoryPanel";
import PromptParams, { DEFAULT_PROMPT_PARAMS, type PromptParamsValue } from "@/components/PromptParams";
import { applyWasmEffect, type WasmEffect } from "@/lib/wasm-image";
import { extractPalette } from "@/lib/color-palette";
import { editImage, type ImageFormat } from "@/lib/basic-editor";
import { addHistory, type HistoryItem } from "@/lib/history";
import {
  Eye, ScanSearch, FileText, GitCompare, Sparkles, Eraser, Palette, Wand2, Cpu, Zap,
  Scissors, Droplet, MessageSquareQuote, Crop,
} from "lucide-react";

type TabId =
  | "analyze" | "detect" | "ocr" | "compare" | "enhance" | "inpaint" | "style" | "generate"
  | "wasm" | "onnx" | "bgRemove" | "palette" | "imageToPrompt" | "editor";

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
  { id: "bgRemove", label: "BG Remove", icon: Scissors, needsImage: true },
  { id: "palette", label: "Palette", icon: Droplet, needsImage: true },
  { id: "wasm", label: "WASM FX", icon: Zap, needsImage: true },
  { id: "onnx", label: "ONNX AI", icon: Cpu, needsImage: true },
  { id: "editor", label: "Editor", icon: Crop, needsImage: true },
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
  const [activeTab, setActiveTab] = useState<TabId>("analyze");
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<ResultState>(null);
  const [wasmEffect, setWasmEffect] = useState<WasmEffect>("grayscale");
  const [promptParams, setPromptParams] = useState<PromptParamsValue>(DEFAULT_PROMPT_PARAMS);
  const [historyKey, setHistoryKey] = useState(0);

  // Editor controls
  const [editWidth, setEditWidth] = useState<string>("");
  const [editHeight, setEditHeight] = useState<string>("");
  const [editRotate, setEditRotate] = useState<"0" | "90" | "180" | "270">("0");
  const [editFormat, setEditFormat] = useState<ImageFormat>("image/png");
  const [editQuality, setEditQuality] = useState<string>("0.9");

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
        setLoadingMsg("Loading ONNX model…");
        const { classifyImage } = await import("@/lib/onnx-inference");
        const start = performance.now();
        const predictions = await classifyImage(image1);
        const elapsed = Math.round(performance.now() - start);
        const text = predictions
          .map((p, i) => `${i + 1}. ${p.label} — ${(p.score * 100).toFixed(1)}%`)
          .join("\n");
        toast.success(`ONNX inference in ${elapsed}ms`);
        res = {
          type: "text",
          content: `ONNX Runtime Web — MobileNet v2 Classification\nProcessed in ${elapsed}ms\n\nTop predictions:\n${text}`,
        };
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
                    <p className="text-xs text-muted-foreground">
                      Runs MobileNet v2 classification via ONNX Runtime Web (WASM).
                      Place custom <code>.onnx</code> models in <code>public/models/</code>.
                    </p>
                  )}

                  {t.id === "bgRemove" && (
                    <p className="text-xs text-muted-foreground">
                      Runs RMBG-1.4 client-side via Transformers.js (WebGPU/WASM).
                      First run downloads the model (~80 MB) — subsequent runs are instant.
                    </p>
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
                </div>

                <ResultDisplay
                  result={result}
                  loading={loading}
                  loadingMessage={loadingMsg}
                  loadingProgress={loadingProgress}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Workspace;
