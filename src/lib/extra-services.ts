/**
 * Extra client-side AI services via @huggingface/transformers.
 * Each function lazily loads its pipeline and caches it.
 */
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

export type ProgressCb = (info: { progress: number; message: string }) => void;

const cache = new Map<string, Promise<any>>();

function get(task: string, model: string, useWebGPU: boolean, onProgress?: ProgressCb) {
  const key = `${task}|${model}|${useWebGPU}`;
  if (cache.has(key)) return cache.get(key)!;
  const p = (async () => {
    const progress_callback = (data: any) => {
      if (data?.status === "progress" && data?.progress != null) {
        onProgress?.({
          progress: Math.min(0.95, data.progress / 100),
          message: data.file ?? "Loading model",
        });
      }
    };
    try {
      return await pipeline(task as any, model, {
        ...(useWebGPU ? { device: "webgpu" as const } : {}),
        progress_callback,
      });
    } catch {
      return await pipeline(task as any, model, { progress_callback });
    }
  })();
  cache.set(key, p);
  return p;
}

export const TRANSFORMER_MODELS = {
  depth: [
    { value: "Xenova/depth-anything-small-hf", label: "Depth-Anything Small" },
    { value: "Xenova/dpt-hybrid-midas", label: "DPT Hybrid MiDaS" },
    { value: "onnx-community/depth-anything-v2-small", label: "Depth-Anything v2 Small" },
  ],
  superres: [
    { value: "Xenova/swin2SR-classical-sr-x2-64", label: "Swin2SR Classical x2" },
    { value: "Xenova/swin2SR-compressed-sr-x4-48", label: "Swin2SR Compressed x4" },
    { value: "Xenova/swin2SR-lightweight-x2-64", label: "Swin2SR Lightweight x2" },
  ],
  caption: [
    { value: "Xenova/vit-gpt2-image-captioning", label: "ViT-GPT2 Captioning" },
    { value: "Xenova/blip-image-captioning-base", label: "BLIP Base" },
    { value: "Xenova/blip-image-captioning-large", label: "BLIP Large" },
  ],
  nsfw: [
    { value: "Xenova/nsfw-image-detection", label: "Falconsai NSFW" },
    { value: "AdamCodd/vit-base-nsfw-detector", label: "ViT NSFW Detector" },
  ],
  faces: [
    { value: "Xenova/yolos-tiny", label: "YOLOS-tiny (general)" },
    { value: "Xenova/detr-resnet-50", label: "DETR ResNet-50 (accurate)" },
    { value: "Xenova/yolos-small", label: "YOLOS-small (balanced)" },
    { value: "Xenova/owlvit-base-patch32", label: "OWL-ViT Base" },
  ],
  embed: [
    { value: "Xenova/clip-vit-base-patch32", label: "CLIP ViT-B/32" },
    { value: "Xenova/clip-vit-base-patch16", label: "CLIP ViT-B/16" },
    { value: "Xenova/siglip-base-patch16-224", label: "SigLIP Base" },
  ],
  classify: [
    { value: "Xenova/vit-base-patch16-224", label: "ViT Base (ImageNet)" },
    { value: "Xenova/mobilenet_v2_1.0_224", label: "MobileNet v2" },
    { value: "Xenova/resnet-50", label: "ResNet-50" },
  ],
  segment: [
    { value: "Xenova/segformer-b0-finetuned-ade-512-512", label: "SegFormer B0 (ADE20K)" },
    { value: "Xenova/segformer_b2_clothes", label: "SegFormer (clothes)" },
  ],
  upscaleAI: [
    { value: "Xenova/swin2SR-compressed-sr-x4-48", label: "Swin2SR x4 (compressed)" },
    { value: "Xenova/swin2SR-classical-sr-x2-64", label: "Swin2SR x2 (classical)" },
    { value: "Xenova/swin2SR-lightweight-x2-64", label: "Swin2SR x2 (lightweight)" },
  ],
} as const;

/** Depth estimation — returns a grayscale depth map data URL. */
export async function estimateDepth(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.depth[0].value,
): Promise<string> {
  const pipe = await get("depth-estimation", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Estimating depth…" });
  const out = await pipe(base64);
  const depth = Array.isArray(out) ? out[0] : out;
  const map = depth?.depth ?? depth;
  const canvas = document.createElement("canvas");
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(map.width, map.height);
  const data = map.data as Uint8Array | Float32Array;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) { if (data[i] < min) min = data[i]; if (data[i] > max) max = data[i]; }
  const range = max - min || 1;
  for (let i = 0; i < data.length; i++) {
    const v = Math.round(((data[i] - min) / range) * 255);
    imageData.data[i * 4] = v;
    imageData.data[i * 4 + 1] = v;
    imageData.data[i * 4 + 2] = v;
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Image super-resolution — upscale ~2x. */
export async function superResolve(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.superres[0].value,
): Promise<string> {
  const pipe = await get("image-to-image", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Upscaling…" });
  const out = await pipe(base64);
  const result = Array.isArray(out) ? out[0] : out;
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(result.width, result.height);
  const src = result.data as Uint8Array;
  const channels = src.length / (result.width * result.height);
  for (let i = 0, j = 0; i < src.length; i += channels, j += 4) {
    imageData.data[j] = src[i];
    imageData.data[j + 1] = src[i + 1] ?? src[i];
    imageData.data[j + 2] = src[i + 2] ?? src[i];
    imageData.data[j + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Image captioning — returns a one-sentence description. */
export async function captionImage(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.caption[0].value,
): Promise<string> {
  const pipe = await get("image-to-text", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Generating caption…" });
  const out = await pipe(base64);
  const first = Array.isArray(out) ? out[0] : out;
  return first?.generated_text ?? "(no caption)";
}

/** NSFW classification — returns label + scores. */
export async function nsfwCheck(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.nsfw[0].value,
) {
  const pipe = await get("image-classification", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Classifying…" });
  const out = await pipe(base64, { topk: 5 });
  return out as { label: string; score: number }[];
}

/** Face / object detection — returns boxes. */
export async function detectFaces(
  base64: string,
  threshold = 0.5,
  model: string = TRANSFORMER_MODELS.faces[0].value,
  onProgress?: ProgressCb,
) {
  const pipe = await get("object-detection", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Detecting…" });
  const out = await pipe(base64, { threshold });
  const arr = Array.isArray(out) ? out : [out];
  return arr as { label: string; score: number; box: { xmin: number; ymin: number; xmax: number; ymax: number } }[];
}

/** Image embedding — returns a Float32Array vector for similarity comparison. */
export async function embedImage(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.embed[0].value,
): Promise<Float32Array> {
  const pipe = await get("image-feature-extraction", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Embedding…" });
  const out = await pipe(base64, { pooling: "mean", normalize: true });
  return out.data as Float32Array;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/* ---------- Batch 2 AI: Classify / Segment / Upscale AI / Colorize ---------- */

/** Image classification — top-k labels with scores. */
export async function classifyImage(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.classify[0].value,
  topk = 5,
) {
  const pipe = await get("image-classification", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Classifying…" });
  const out = await pipe(base64, { topk });
  return out as { label: string; score: number }[];
}

/** Semantic segmentation — returns colored overlay + per-segment labels. */
export async function segmentImage(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.segment[0].value,
): Promise<{ dataUrl: string; segments: { label: string; score: number }[] }> {
  const pipe = await get("image-segmentation", model, true, onProgress);
  onProgress?.({ progress: 0.7, message: "Segmenting…" });
  const out = await pipe(base64);
  const arr = (Array.isArray(out) ? out : [out]) as Array<{
    label: string; score: number; mask: { width: number; height: number; data: Uint8Array };
  }>;
  if (!arr.length) throw new Error("No segments detected");
  const { width, height } = arr[0].mask;
  // Load original to composite under overlay
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => res(i); i.onerror = rej; i.src = base64;
  });
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  const overlay = ctx.createImageData(width, height);
  // Assign each segment a distinct hue
  arr.forEach((seg, idx) => {
    const hue = (idx * 137) % 360;
    const { r, g, b } = hslToRgb(hue, 70, 50);
    const m = seg.mask.data;
    for (let i = 0; i < m.length; i++) {
      if (m[i]) {
        const o = i * 4;
        overlay.data[o] = r; overlay.data[o + 1] = g; overlay.data[o + 2] = b; overlay.data[o + 3] = 140;
      }
    }
  });
  const ov = document.createElement("canvas");
  ov.width = width; ov.height = height;
  ov.getContext("2d")!.putImageData(overlay, 0, 0);
  ctx.drawImage(ov, 0, 0);
  return {
    dataUrl: c.toDataURL("image/png"),
    segments: arr.map(({ label, score }) => ({ label, score })),
  };
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
}

/** AI upscale — wraps super-res with a different default model surfaced as its own tab. */
export async function upscaleAI(
  base64: string,
  onProgress?: ProgressCb,
  model: string = TRANSFORMER_MODELS.upscaleAI[0].value,
): Promise<string> {
  return superResolve(base64, onProgress, model);
}

/**
 * Pseudo-colorize for B&W photos. No reliable colorization model ships on
 * Transformers.js, so this applies a warm tone-mapping over luminance —
 * stylistic colorization, not ML-based.
 */
export async function colorizeImage(
  base64: string,
  tone: "warm" | "cool" | "sepia" | "vibrant" = "warm",
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => res(i); i.onerror = rej; i.src = base64;
  });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const palettes: Record<string, [number, number, number][]> = {
    // shadows, midtones, highlights tint
    warm: [[40, 25, 15], [180, 130, 90], [255, 235, 200]],
    cool: [[15, 25, 45], [90, 130, 180], [200, 220, 255]],
    sepia: [[35, 25, 15], [165, 130, 90], [245, 225, 190]],
    vibrant: [[20, 30, 60], [180, 80, 140], [255, 220, 100]],
  };
  const [sh, mid, hi] = palettes[tone];
  for (let i = 0; i < id.data.length; i += 4) {
    const L = (0.299 * id.data[i] + 0.587 * id.data[i + 1] + 0.114 * id.data[i + 2]) / 255;
    // Two-segment linear interpolation: shadow→mid (0..0.5) and mid→hi (0.5..1)
    let r: number, g: number, b: number;
    if (L < 0.5) {
      const t = L * 2;
      r = sh[0] + (mid[0] - sh[0]) * t;
      g = sh[1] + (mid[1] - sh[1]) * t;
      b = sh[2] + (mid[2] - sh[2]) * t;
    } else {
      const t = (L - 0.5) * 2;
      r = mid[0] + (hi[0] - mid[0]) * t;
      g = mid[1] + (hi[1] - mid[1]) * t;
      b = mid[2] + (hi[2] - mid[2]) * t;
    }
    id.data[i] = r; id.data[i + 1] = g; id.data[i + 2] = b;
  }
  ctx.putImageData(id, 0, 0);
  return c.toDataURL("image/png");
}
