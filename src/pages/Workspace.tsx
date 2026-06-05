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
import QuotaBar from "@/components/QuotaBar";
import ToolErrorBoundary from "@/components/ToolErrorBoundary";
import { useUndoRedo } from "@/hooks/useUndoRedo";
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
  SlidersHorizontal, Filter, BarChart3, FileImage, EyeOff,
  Combine, GitCompareArrows, Fingerprint as FingerprintIcon, FileJson,
  Boxes, Tags, Rainbow, ArrowUpRightSquare,
  Undo2, Redo2,
} from "lucide-react";

type TabId =
  | "analyze" | "detect" | "ocr" | "compare" | "enhance" | "inpaint" | "style" | "generate"
  | "wasm" | "onnx" | "bgRemove" | "palette" | "imageToPrompt" | "editor"
  | "depth" | "superres" | "caption" | "nsfw" | "faces" | "similarity"
  | "adjust" | "filters" | "histogram" | "convert" | "redact"
  | "stitch" | "diff" | "fingerprint" | "textOverlay" | "metadata"
  | "segment" | "classify" | "upscaleAI" | "colorize"
  | "settings";

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
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal, needsImage: true },
  { id: "filters", label: "Filters", icon: Filter, needsImage: true },
  { id: "histogram", label: "Histogram", icon: BarChart3, needsImage: true },
  { id: "convert", label: "Convert", icon: FileImage, needsImage: true },
  { id: "redact", label: "Redact", icon: EyeOff, needsImage: true },
  { id: "stitch", label: "Stitch", icon: Combine, needsImage: false },
  { id: "diff", label: "Diff", icon: GitCompareArrows, needsImage: true, needsSecondImage: true },
  { id: "fingerprint", label: "Fingerprint", icon: FingerprintIcon, needsImage: true },
  { id: "textOverlay", label: "Text Overlay", icon: Type, needsImage: true },
  { id: "metadata", label: "Metadata", icon: FileJson, needsImage: true },
  { id: "segment", label: "Segment", icon: Boxes, needsImage: true },
  { id: "classify", label: "Classify", icon: Tags, needsImage: true },
  { id: "upscaleAI", label: "Upscale AI", icon: ArrowUpRightSquare, needsImage: true },
  { id: "colorize", label: "Colorize", icon: Rainbow, needsImage: true },
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
  const {
    value: image1, set: setImage1,
    undo: undoImage, redo: redoImage,
    canUndo: canUndoImage, canRedo: canRedoImage,
  } = useUndoRedo<string | null>(null, { enableShortcuts: true });
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
  // Imported lazily, but registry is small so we duplicate options here
  const FACE_MODELS = [
    { value: "Xenova/yolos-tiny", label: "YOLOS-tiny (general)" },
    { value: "Xenova/detr-resnet-50", label: "DETR ResNet-50 (accurate)" },
    { value: "Xenova/yolos-small", label: "YOLOS-small (balanced)" },
    { value: "Xenova/owlvit-base-patch32", label: "OWL-ViT Base" },
  ];
  const DEPTH_MODELS = [
    { value: "Xenova/depth-anything-small-hf", label: "Depth-Anything Small" },
    { value: "Xenova/dpt-hybrid-midas", label: "DPT Hybrid MiDaS" },
    { value: "onnx-community/depth-anything-v2-small", label: "Depth-Anything v2 Small" },
  ];
  const SUPERRES_MODELS = [
    { value: "Xenova/swin2SR-classical-sr-x2-64", label: "Swin2SR Classical x2" },
    { value: "Xenova/swin2SR-compressed-sr-x4-48", label: "Swin2SR Compressed x4" },
    { value: "Xenova/swin2SR-lightweight-x2-64", label: "Swin2SR Lightweight x2" },
  ];
  const CAPTION_MODELS = [
    { value: "Xenova/vit-gpt2-image-captioning", label: "ViT-GPT2" },
    { value: "Xenova/blip-image-captioning-base", label: "BLIP Base" },
    { value: "Xenova/blip-image-captioning-large", label: "BLIP Large" },
  ];
  const NSFW_MODELS = [
    { value: "Xenova/nsfw-image-detection", label: "Falconsai NSFW" },
    { value: "AdamCodd/vit-base-nsfw-detector", label: "ViT NSFW Detector" },
  ];
  const EMBED_MODELS = [
    { value: "Xenova/clip-vit-base-patch32", label: "CLIP ViT-B/32" },
    { value: "Xenova/clip-vit-base-patch16", label: "CLIP ViT-B/16" },
    { value: "Xenova/siglip-base-patch16-224", label: "SigLIP Base" },
  ];
  const [faceModel, setFaceModel] = usePersistedState<string>("ait_ws_face_model", FACE_MODELS[0].value);
  const [depthModel, setDepthModel] = usePersistedState<string>("ait_ws_depth_model", DEPTH_MODELS[0].value);
  const [superresModel, setSuperresModel] = usePersistedState<string>("ait_ws_superres_model", SUPERRES_MODELS[0].value);
  const [captionModel, setCaptionModel] = usePersistedState<string>("ait_ws_caption_model", CAPTION_MODELS[0].value);
  const [nsfwModel, setNsfwModel] = usePersistedState<string>("ait_ws_nsfw_model", NSFW_MODELS[0].value);
  const [embedModel, setEmbedModel] = usePersistedState<string>("ait_ws_embed_model", EMBED_MODELS[0].value);
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

  // Adjust / Filters / Convert / Redact (persisted)
  const [adjBright, setAdjBright] = usePersistedState<number>("ait_ws_adj_b", 0);
  const [adjContrast, setAdjContrast] = usePersistedState<number>("ait_ws_adj_c", 0);
  const [adjSat, setAdjSat] = usePersistedState<number>("ait_ws_adj_s", 0);
  const [adjHue, setAdjHue] = usePersistedState<number>("ait_ws_adj_h", 0);
  const [adjBlur, setAdjBlur] = usePersistedState<number>("ait_ws_adj_bl", 0);
  const [adjSharp, setAdjSharp] = usePersistedState<number>("ait_ws_adj_sh", 0);
  const [filterPreset, setFilterPreset] = usePersistedState<string>("ait_ws_filter", "vintage");
  const [convFormat, setConvFormat] = usePersistedState<"image/png" | "image/jpeg" | "image/webp">("ait_ws_conv_f", "image/webp");
  const [convQuality, setConvQuality] = usePersistedState<number>("ait_ws_conv_q", 0.85);
  const [convTarget, setConvTarget] = usePersistedState<string>("ait_ws_conv_t", "");
  const [redactMode, setRedactMode] = usePersistedState<"black" | "blur" | "pixelate">("ait_ws_red_m", "black");

  // Stitch
  const [stitchSources, setStitchSources] = useState<string[]>([]);
  const [stitchDir, setStitchDir] = usePersistedState<"horizontal" | "vertical">("ait_ws_stitch_dir", "horizontal");
  const [stitchGap, setStitchGap] = usePersistedState<number>("ait_ws_stitch_gap", 0);
  // Diff
  const [diffThreshold, setDiffThreshold] = usePersistedState<number>("ait_ws_diff_t", 20);
  // Fingerprint
  const [fingerprintHash, setFingerprintHash] = useState<string>("");
  // Text overlay
  const [overlayText, setOverlayText] = usePersistedState<string>("ait_ws_ovr_t", "Sample");
  const [overlaySize, setOverlaySize] = usePersistedState<number>("ait_ws_ovr_s", 48);
  const [overlayColor, setOverlayColor] = usePersistedState<string>("ait_ws_ovr_c", "#ffffff");
  const [overlayOpacity, setOverlayOpacity] = usePersistedState<number>("ait_ws_ovr_o", 90);
  const [overlayPos, setOverlayPos] = usePersistedState<"top-left" | "top-right" | "bottom-left" | "bottom-right" | "center">("ait_ws_ovr_p", "bottom-right");
  const [overlayStroke, setOverlayStroke] = usePersistedState<boolean>("ait_ws_ovr_st", true);
  // Metadata
  const [metadataFormat, setMetadataFormat] = usePersistedState<"image/png" | "image/jpeg" | "image/webp">("ait_ws_meta_fmt", "image/png");

  // Batch 2 AI: Classify / Segment / Upscale AI / Colorize
  const CLASSIFY_MODELS = [
    { value: "Xenova/vit-base-patch16-224", label: "ViT Base (ImageNet)" },
    { value: "Xenova/mobilenet_v2_1.0_224", label: "MobileNet v2" },
    { value: "Xenova/resnet-50", label: "ResNet-50" },
  ];
  const SEGMENT_MODELS = [
    { value: "Xenova/segformer-b0-finetuned-ade-512-512", label: "SegFormer B0 (ADE20K)" },
    { value: "Xenova/segformer_b2_clothes", label: "SegFormer (clothes)" },
  ];
  const UPSCALE_AI_MODELS = [
    { value: "Xenova/swin2SR-compressed-sr-x4-48", label: "Swin2SR x4 (compressed)" },
    { value: "Xenova/swin2SR-classical-sr-x2-64", label: "Swin2SR x2 (classical)" },
    { value: "Xenova/swin2SR-lightweight-x2-64", label: "Swin2SR x2 (lightweight)" },
  ];
  const [classifyModel, setClassifyModel] = usePersistedState<string>("ait_ws_classify_m", CLASSIFY_MODELS[0].value);
  const [segmentModel, setSegmentModel] = usePersistedState<string>("ait_ws_segment_m", SEGMENT_MODELS[0].value);
  const [upscaleAIModel, setUpscaleAIModel] = usePersistedState<string>("ait_ws_upscaleai_m", UPSCALE_AI_MODELS[0].value);
  const [colorizeTone, setColorizeTone] = usePersistedState<"warm" | "cool" | "sepia" | "vibrant">("ait_ws_colorize_t", "warm");

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
        }, depthModel);
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "superres") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading upscaler…");
        setLoadingProgress(0);
        const { superResolve } = await import("@/lib/extra-services");
        const out = await superResolve(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        }, superresModel);
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "caption") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading captioner…");
        setLoadingProgress(0);
        const { captionImage } = await import("@/lib/extra-services");
        const text = await captionImage(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        }, captionModel);
        res = { type: "text", content: text };
      } else if (activeTab === "nsfw") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading NSFW classifier…");
        setLoadingProgress(0);
        const { nsfwCheck } = await import("@/lib/extra-services");
        const out = await nsfwCheck(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        }, nsfwModel);
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
        }, embedModel);
        const sims: { idx: number; sim: number }[] = [];
        for (let i = 0; i < targets.length; i++) {
          const b = await embedImage(targets[i], ({ progress, message }) => {
            setLoadingMsg(`Image ${i + 1}/${targets.length}: ${message}`);
            setLoadingProgress((1 + i + progress) / (targets.length + 1));
          }, embedModel);
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
      } else if (activeTab === "adjust") {
        if (!image1) throw new Error("Upload an image first");
        const { applyAdjust } = await import("@/lib/image-tools");
        const out = await applyAdjust(image1, {
          brightness: adjBright, contrast: adjContrast, saturation: adjSat,
          hue: adjHue, blur: adjBlur, sharpness: adjSharp,
        });
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "filters") {
        if (!image1) throw new Error("Upload an image first");
        const { applyFilter } = await import("@/lib/image-tools");
        const out = await applyFilter(image1, filterPreset as any);
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "histogram") {
        if (!image1) throw new Error("Upload an image first");
        const { renderHistogram } = await import("@/lib/image-tools");
        const { dataUrl } = await renderHistogram(image1);
        res = { type: "image", content: dataUrl, original: image1 };
      } else if (activeTab === "convert") {
        if (!image1) throw new Error("Upload an image first");
        const { convertImage, compressToSize } = await import("@/lib/image-tools");
        const target = parseInt(convTarget);
        const r = target > 0
          ? await compressToSize(image1, target * 1024, convFormat === "image/png" ? "image/jpeg" : convFormat)
          : await convertImage(image1, convFormat, convQuality);
        toast.success(`Output: ${(r.bytes / 1024).toFixed(1)} KB`);
        res = { type: "image", content: r.dataUrl, original: image1 };
      } else if (activeTab === "redact") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Detecting regions…");
        const { detectFaces } = await import("@/lib/extra-services");
        const { redactRegions } = await import("@/lib/image-tools");
        const boxes = await detectFaces(image1, 0.4, faceModel, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        });
        if (!boxes.length) throw new Error("No regions detected — try Faces tab with lower threshold");
        const regions = boxes.map((b: any) => ({
          x: b.box.xmin, y: b.box.ymin,
          w: b.box.xmax - b.box.xmin, h: b.box.ymax - b.box.ymin,
        }));
        const out = await redactRegions(image1, regions, redactMode);
        toast.success(`Redacted ${regions.length} region(s)`);
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "stitch") {
        if (stitchSources.length < 2) throw new Error("Add at least 2 images to stitch");
        const { stitchImages } = await import("@/lib/image-tools");
        const out = await stitchImages(stitchSources, stitchDir, stitchGap);
        toast.success(`Stitched ${stitchSources.length} images`);
        res = { type: "image", content: out };
      } else if (activeTab === "diff") {
        if (!image1 || !image2) throw new Error("Upload both images");
        const { imageDiff } = await import("@/lib/image-tools");
        const d = await imageDiff(image1, image2, diffThreshold);
        toast.success(`${d.pctDifferent.toFixed(2)}% pixels differ`);
        res = { type: "image", content: d.dataUrl, original: image1 };
      } else if (activeTab === "fingerprint") {
        if (!image1) throw new Error("Upload an image first");
        const { perceptualHash, hammingDistance } = await import("@/lib/image-tools");
        const h1 = await perceptualHash(image1);
        setFingerprintHash(h1);
        let text = `pHash: ${h1}\n(64-bit perceptual hash — same scene ≈ low Hamming distance)`;
        if (image2) {
          const h2 = await perceptualHash(image2);
          const dist = hammingDistance(h1, h2);
          const sim = ((64 - dist) / 64) * 100;
          text += `\n\nCompare hash: ${h2}\nHamming distance: ${dist} / 64\nSimilarity: ${sim.toFixed(1)}%`;
        }
        res = { type: "text", content: text };
      } else if (activeTab === "textOverlay") {
        if (!image1) throw new Error("Upload an image first");
        const { addTextOverlay } = await import("@/lib/image-tools");
        const out = await addTextOverlay(image1, {
          text: overlayText, size: overlaySize, color: overlayColor,
          opacity: overlayOpacity / 100, position: overlayPos, stroke: overlayStroke,
        });
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "metadata") {
        if (!image1) throw new Error("Upload an image first");
        const { stripMetadata } = await import("@/lib/image-tools");
        const { dataUrl, bytes } = await stripMetadata(image1, metadataFormat);
        toast.success(`Re-encoded (EXIF stripped): ${(bytes / 1024).toFixed(1)} KB`);
        res = { type: "image", content: dataUrl, original: image1 };
      } else if (activeTab === "classify") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading classifier…");
        setLoadingProgress(0);
        const { classifyImage } = await import("@/lib/extra-services");
        const out = await classifyImage(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        }, classifyModel, 5);
        const text = out.map((o, i) => `${i + 1}. ${o.label} — ${(o.score * 100).toFixed(1)}%`).join("\n");
        res = { type: "text", content: `Top predictions:\n${text}` };
      } else if (activeTab === "segment") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading segmenter…");
        setLoadingProgress(0);
        const { segmentImage } = await import("@/lib/extra-services");
        const { dataUrl, segments } = await segmentImage(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        }, segmentModel);
        toast.success(`Found ${segments.length} segment(s)`);
        const labels = segments.map((s, i) => `${i + 1}. ${s.label} — ${(s.score * 100).toFixed(0)}%`).join("\n");
        await saveToHistory("segment", "Segment", { type: "text", content: labels });
        res = { type: "image", content: dataUrl, original: image1 };
      } else if (activeTab === "upscaleAI") {
        if (!image1) throw new Error("Upload an image first");
        setLoadingMsg("Loading AI upscaler…");
        setLoadingProgress(0);
        const { upscaleAI } = await import("@/lib/extra-services");
        const out = await upscaleAI(image1, ({ progress, message }) => {
          setLoadingMsg(message); setLoadingProgress(progress);
        }, upscaleAIModel);
        res = { type: "image", content: out, original: image1 };
      } else if (activeTab === "colorize") {
        if (!image1) throw new Error("Upload an image first");
        const { colorizeImage } = await import("@/lib/extra-services");
        const out = await colorizeImage(image1, colorizeTone);
        toast.success("Colorized (stylistic tone mapping)");
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
            <Button
              size="icon" variant="ghost" onClick={undoImage} disabled={!canUndoImage}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon" variant="ghost" onClick={redoImage} disabled={!canRedoImage}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <HistoryPanel refreshKey={historyKey} onRestore={handleRestore} />
            <ClerkAuth />
          </div>
        </div>
      </header>

      <div className="container flex-1 py-6">
        <div className="mb-4"><QuotaBar /></div>
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
              <ToolErrorBoundary toolName={t.label} onReset={resetState}>
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
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      <div>
                        <Label className="text-xs">Detector model</Label>
                        <Select value={faceModel} onValueChange={(v) => setFaceModel(v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FACE_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
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
                          className="mt-2"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Threshold persists per model. Lower = more detections.
                        </p>
                      </div>
                      {faceBoxes.length > 0 && (
                        <div className="space-y-2 border-t pt-3">
                          <Label className="text-xs">Label detections</Label>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {faceBoxes.map((b, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-[11px] font-mono w-16 text-muted-foreground shrink-0">
                                  #{i + 1} {(b.score * 100).toFixed(0)}%
                                </span>
                                <Input
                                  value={faceLabels[i] ?? ""}
                                  placeholder={b.label}
                                  onChange={(e) => setFaceLabels((m) => ({ ...m, [i]: e.target.value }))}
                                  className="h-7 text-xs"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!image1) return;
                                const { drawBoxesOnImage } = await import("@/lib/draw-boxes");
                                const annotated = await drawBoxesOnImage(image1, faceBoxes, { customLabels: faceLabels });
                                setResult({ type: "image", content: annotated, original: image1 });
                                toast.success("Re-annotated with custom labels");
                              }}
                            >
                              Re-render labels
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const { facesToJSON, downloadText } = await import("@/lib/face-export");
                                const json = facesToJSON(faceBoxes, faceLabels, {
                                  model: faceModel,
                                  threshold: faceThreshold,
                                  imageWidth: faceImageDims?.w,
                                  imageHeight: faceImageDims?.h,
                                });
                                downloadText(`faces-${Date.now()}.json`, json, "application/json");
                              }}
                            >
                              Export JSON
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const { facesToCSV, downloadText } = await import("@/lib/face-export");
                                downloadText(`faces-${Date.now()}.csv`, facesToCSV(faceBoxes, faceLabels), "text/csv");
                              }}
                            >
                              Export CSV
                            </Button>
                          </div>
                        </div>
                      )}
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
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="text-xs font-medium">Ranked results ({similarityRanked.length})</p>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => {
                                  const next = simSort === "desc" ? "asc" : "desc";
                                  setSimSort(next);
                                  setSimilarityRanked((r) => [...r].sort((a, b) => next === "desc" ? b.sim - a.sim : a.sim - b.sim));
                                }}
                              >
                                Sort: {simSort === "desc" ? "High → Low" : "Low → High"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={async () => {
                                  const { similarityToJSON, downloadText } = await import("@/lib/face-export");
                                  downloadText(`similarity-${Date.now()}.json`, similarityToJSON(similarityRanked), "application/json");
                                }}
                              >
                                JSON
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={async () => {
                                  const { similarityToCSV, downloadText } = await import("@/lib/face-export");
                                  downloadText(`similarity-${Date.now()}.csv`, similarityToCSV(similarityRanked), "text/csv");
                                }}
                              >
                                CSV
                              </Button>
                            </div>
                          </div>
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

                  {t.id === "adjust" && (
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      {[
                        { label: "Brightness", value: adjBright, set: setAdjBright, min: -100, max: 100 },
                        { label: "Contrast", value: adjContrast, set: setAdjContrast, min: -100, max: 100 },
                        { label: "Saturation", value: adjSat, set: setAdjSat, min: -100, max: 100 },
                        { label: "Hue", value: adjHue, set: setAdjHue, min: -180, max: 180 },
                        { label: "Blur (px)", value: adjBlur, set: setAdjBlur, min: 0, max: 20 },
                        { label: "Sharpness", value: adjSharp, set: setAdjSharp, min: 0, max: 100 },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs">
                            <Label>{s.label}</Label>
                            <span className="font-mono text-muted-foreground">{s.value}</span>
                          </div>
                          <Slider value={[s.value]} min={s.min} max={s.max} step={1}
                            onValueChange={([v]) => s.set(v)} className="mt-1.5" />
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => { setAdjBright(0); setAdjContrast(0); setAdjSat(0); setAdjHue(0); setAdjBlur(0); setAdjSharp(0); }}>
                        Reset all
                      </Button>
                    </div>
                  )}

                  {t.id === "filters" && (
                    <Select value={filterPreset} onValueChange={setFilterPreset}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[
                          ["vintage","Vintage"],["cinematic","Cinematic"],["bw","Black & White"],
                          ["noir","Noir"],["warm","Warm"],["cool","Cool"],["fade","Fade"],
                          ["vivid","Vivid"],["sepia","Sepia"],["dramatic","Dramatic"],["lomo","Lomo"],
                        ].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  {t.id === "histogram" && (
                    <p className="text-xs text-muted-foreground">
                      Computes RGB + luminance distribution. Red/green/blue channels overlaid; white = luminance.
                    </p>
                  )}

                  {t.id === "convert" && (
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      <div>
                        <Label className="text-xs">Format</Label>
                        <Select value={convFormat} onValueChange={(v) => setConvFormat(v as any)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image/png">PNG (lossless)</SelectItem>
                            <SelectItem value="image/jpeg">JPEG</SelectItem>
                            <SelectItem value="image/webp">WebP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <Label>Quality</Label>
                          <span className="font-mono text-muted-foreground">{(convQuality * 100).toFixed(0)}%</span>
                        </div>
                        <Slider value={[convQuality * 100]} min={5} max={100} step={1}
                          onValueChange={([v]) => setConvQuality(v / 100)} className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="text-xs">Target size (KB, optional)</Label>
                        <Input value={convTarget} onChange={(e) => setConvTarget(e.target.value)}
                          placeholder="e.g. 200" type="number" />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          If set, quality is auto-tuned to hit this size (JPEG/WebP only).
                        </p>
                      </div>
                    </div>
                  )}

                  {t.id === "redact" && (
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      <div>
                        <Label className="text-xs">Redaction style</Label>
                        <Select value={redactMode} onValueChange={(v) => setRedactMode(v as any)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="black">Solid black bars</SelectItem>
                            <SelectItem value="blur">Heavy blur</SelectItem>
                            <SelectItem value="pixelate">Pixelate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Auto-detects faces/objects with the current Faces detector model and redacts each region.
                      </p>
                    </div>
                  )}

                  {t.id === "stitch" && (
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          const urls = await Promise.all(files.map(fileToBase64));
                          setStitchSources((s) => [...s, ...urls]);
                          e.target.value = "";
                        }}
                      />
                      {stitchSources.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {stitchSources.map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt={`#${i + 1}`} className="w-full aspect-square object-cover rounded border" />
                              <button
                                onClick={() => setStitchSources((s) => s.filter((_, j) => j !== i))}
                                className="absolute top-0.5 right-0.5 rounded bg-background/90 px-1 text-[10px] border opacity-0 group-hover:opacity-100"
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Direction</Label>
                          <Select value={stitchDir} onValueChange={(v) => setStitchDir(v as any)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="horizontal">Horizontal</SelectItem>
                              <SelectItem value="vertical">Vertical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Gap (px)</Label>
                          <Input type="number" value={stitchGap} onChange={(e) => setStitchGap(parseInt(e.target.value) || 0)} className="mt-1" />
                        </div>
                      </div>
                      {stitchSources.length > 0 && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStitchSources([])}>
                          Clear all
                        </Button>
                      )}
                    </div>
                  )}

                  {t.id === "diff" && (
                    <div className="rounded-md border p-3 bg-muted/30">
                      <div className="flex justify-between text-xs">
                        <Label>Difference threshold</Label>
                        <span className="font-mono text-muted-foreground">{diffThreshold}</span>
                      </div>
                      <Slider value={[diffThreshold]} min={0} max={120} step={1}
                        onValueChange={([v]) => setDiffThreshold(v)} className="mt-1.5" />
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Pixels with RGB distance above this are highlighted red. Lower = stricter.
                      </p>
                    </div>
                  )}

                  {t.id === "fingerprint" && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Computes a 64-bit perceptual hash (pHash via DCT). Add a second image to compare similarity.
                      </p>
                      <ImageUploader
                        label="Compare image (optional)"
                        image={image2}
                        onDrop={(f) => handleImageDrop(f, 2)}
                        onClear={() => setImage2(null)}
                      />
                      {fingerprintHash && (
                        <div className="rounded border bg-muted/30 p-2">
                          <p className="text-[11px] text-muted-foreground">Last hash</p>
                          <p className="font-mono text-xs break-all">{fingerprintHash}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {t.id === "textOverlay" && (
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      <div>
                        <Label className="text-xs">Text</Label>
                        <Input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Position</Label>
                          <Select value={overlayPos} onValueChange={(v) => setOverlayPos(v as any)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top-left">Top left</SelectItem>
                              <SelectItem value="top-right">Top right</SelectItem>
                              <SelectItem value="bottom-left">Bottom left</SelectItem>
                              <SelectItem value="bottom-right">Bottom right</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Input type="color" value={overlayColor} onChange={(e) => setOverlayColor(e.target.value)} className="mt-1 h-9 p-1" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <Label>Font size (px)</Label>
                          <span className="font-mono text-muted-foreground">{overlaySize}</span>
                        </div>
                        <Slider value={[overlaySize]} min={12} max={200} step={1}
                          onValueChange={([v]) => setOverlaySize(v)} className="mt-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <Label>Opacity (%)</Label>
                          <span className="font-mono text-muted-foreground">{overlayOpacity}</span>
                        </div>
                        <Slider value={[overlayOpacity]} min={10} max={100} step={1}
                          onValueChange={([v]) => setOverlayOpacity(v)} className="mt-1.5" />
                      </div>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={overlayStroke} onChange={(e) => setOverlayStroke(e.target.checked)} />
                        Black outline (readability)
                      </label>
                    </div>
                  )}

                  {t.id === "metadata" && (
                    <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                      <div>
                        <Label className="text-xs">Re-encode format</Label>
                        <Select value={metadataFormat} onValueChange={(v) => setMetadataFormat(v as any)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image/png">PNG (lossless)</SelectItem>
                            <SelectItem value="image/jpeg">JPEG</SelectItem>
                            <SelectItem value="image/webp">WebP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Re-encoding through canvas strips all EXIF / GPS / author / camera metadata. Outputs a clean copy you can safely share.
                      </p>
                    </div>
                  )}

                  {t.id === "classify" && (
                    <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                      <Label className="text-xs">Classifier model</Label>
                      <Select value={classifyModel} onValueChange={setClassifyModel}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CLASSIFY_MODELS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        ImageNet-1k labels. Runs locally via Transformers.js (WebGPU when available).
                      </p>
                    </div>
                  )}

                  {t.id === "segment" && (
                    <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                      <Label className="text-xs">Segmentation model</Label>
                      <Select value={segmentModel} onValueChange={setSegmentModel}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEGMENT_MODELS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Each segment is overlaid with a distinct color. Labels are listed in history.
                      </p>
                    </div>
                  )}

                  {t.id === "upscaleAI" && (
                    <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                      <Label className="text-xs">Upscaler model</Label>
                      <Select value={upscaleAIModel} onValueChange={setUpscaleAIModel}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UPSCALE_AI_MODELS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Swin2SR family — x2 / x4 super-resolution. First run downloads weights (~50–150 MB).
                      </p>
                    </div>
                  )}

                  {t.id === "colorize" && (
                    <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                      <Label className="text-xs">Tone palette</Label>
                      <Select value={colorizeTone} onValueChange={(v) => setColorizeTone(v as any)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warm">Warm (skin/golden hour)</SelectItem>
                          <SelectItem value="cool">Cool (blue night)</SelectItem>
                          <SelectItem value="sepia">Sepia (vintage)</SelectItem>
                          <SelectItem value="vibrant">Vibrant (split-tone)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Stylistic luminance-based tone mapping for B&amp;W photos. Not ML-based — no widely-available
                        colorization model ships on Transformers.js yet.
                      </p>
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

                  {(() => {
                    const modelPickers: Record<string, { opts: { value: string; label: string }[]; value: string; set: (v: string) => void }> = {
                      depth: { opts: DEPTH_MODELS, value: depthModel, set: setDepthModel },
                      superres: { opts: SUPERRES_MODELS, value: superresModel, set: setSuperresModel },
                      caption: { opts: CAPTION_MODELS, value: captionModel, set: setCaptionModel },
                      nsfw: { opts: NSFW_MODELS, value: nsfwModel, set: setNsfwModel },
                      similarity: { opts: EMBED_MODELS, value: embedModel, set: setEmbedModel },
                    };
                    const p = modelPickers[t.id];
                    if (!p) return null;
                    return (
                      <div>
                        <Label className="text-xs">Model</Label>
                        <Select value={p.value} onValueChange={p.set}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {p.opts.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

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
