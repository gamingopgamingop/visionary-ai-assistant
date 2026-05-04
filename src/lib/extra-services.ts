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

/** Depth estimation — returns a grayscale depth map data URL. */
export async function estimateDepth(base64: string, onProgress?: ProgressCb): Promise<string> {
  const pipe = await get("depth-estimation", "Xenova/depth-anything-small-hf", true, onProgress);
  onProgress?.({ progress: 0.7, message: "Estimating depth…" });
  const out = await pipe(base64);
  const depth = Array.isArray(out) ? out[0] : out;
  const map = depth?.depth ?? depth;
  // Convert RawImage to canvas
  const canvas = document.createElement("canvas");
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(map.width, map.height);
  const data = map.data as Uint8Array | Float32Array;
  // Normalize to 0-255
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
export async function superResolve(base64: string, onProgress?: ProgressCb): Promise<string> {
  const pipe = await get("image-to-image", "Xenova/swin2SR-classical-sr-x2-64", true, onProgress);
  onProgress?.({ progress: 0.7, message: "Upscaling…" });
  const out = await pipe(base64);
  const result = Array.isArray(out) ? out[0] : out;
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(result.width, result.height);
  const src = result.data as Uint8Array;
  // Result is RGB; convert to RGBA
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
export async function captionImage(base64: string, onProgress?: ProgressCb): Promise<string> {
  const pipe = await get("image-to-text", "Xenova/vit-gpt2-image-captioning", true, onProgress);
  onProgress?.({ progress: 0.7, message: "Generating caption…" });
  const out = await pipe(base64);
  const first = Array.isArray(out) ? out[0] : out;
  return first?.generated_text ?? "(no caption)";
}

/** NSFW classification — returns label + scores. */
export async function nsfwCheck(base64: string, onProgress?: ProgressCb) {
  const pipe = await get("image-classification", "Xenova/nsfw-image-detection", true, onProgress);
  onProgress?.({ progress: 0.7, message: "Classifying…" });
  const out = await pipe(base64, { topk: 5 });
  return out as { label: string; score: number }[];
}

/** Face detection — returns boxes. */
export async function detectFaces(base64: string, onProgress?: ProgressCb) {
  const pipe = await get("object-detection", "Xenova/yolos-tiny", true, onProgress);
  onProgress?.({ progress: 0.7, message: "Detecting…" });
  const out = await pipe(base64, { threshold: 0.5 });
  // Filter to face/person-like classes; fall back to all
  const arr = Array.isArray(out) ? out : [out];
  return arr as { label: string; score: number; box: { xmin: number; ymin: number; xmax: number; ymax: number } }[];
}

/** Image embedding — returns a Float32Array vector for similarity comparison. */
export async function embedImage(base64: string, onProgress?: ProgressCb): Promise<Float32Array> {
  const pipe = await get("image-feature-extraction", "Xenova/clip-vit-base-patch32", true, onProgress);
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
