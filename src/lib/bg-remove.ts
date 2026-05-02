/**
 * Client-side background removal using HuggingFace Transformers.
 * Runs in-browser via WebGPU when available, falls back to WASM.
 * Supports configurable model + max-dim + WebGPU toggle for batch use.
 */
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

export type BgModelId = "briaai/RMBG-1.4" | "Xenova/modnet" | string;

const DEFAULT_MAX_DIM = 1024;

export type ProgressCb = (info: {
  stage: "loading-model" | "segmenting" | "compositing";
  progress: number; // 0-1
  message?: string;
}) => void;

export interface BgRemoveOptions {
  model?: BgModelId;
  maxDim?: number;
  useWebGPU?: boolean;
  onProgress?: ProgressCb;
}

// Cache one segmenter per (model, device) pair.
const cache = new Map<string, Promise<any>>();

async function getSegmenter(
  model: BgModelId,
  useWebGPU: boolean,
  onProgress?: ProgressCb,
) {
  const key = `${model}|${useWebGPU ? "webgpu" : "wasm"}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const progress_callback = (data: any) => {
      if (data?.status === "progress" && data?.progress != null) {
        onProgress?.({
          stage: "loading-model",
          progress: Math.min(0.95, (data.progress as number) / 100),
          message: data.file ?? "Downloading model",
        });
      }
    };
    let seg: any;
    try {
      seg = await pipeline("background-removal", model, {
        ...(useWebGPU ? { device: "webgpu" as const } : {}),
        progress_callback,
      });
    } catch {
      seg = await pipeline("background-removal", model, { progress_callback });
    }
    onProgress?.({ stage: "loading-model", progress: 1, message: "Model ready" });
    return seg;
  })();

  cache.set(key, promise);
  return promise;
}

function resizeIfNeeded(canvas: HTMLCanvasElement, maxDim: number) {
  const { width, height } = canvas;
  if (width <= maxDim && height <= maxDim) return canvas;
  const scale = Math.min(maxDim / width, maxDim / height);
  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  out.getContext("2d")!.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

async function runRemoval(
  base64: string,
  model: BgModelId,
  maxDim: number,
  useWebGPU: boolean,
  onProgress?: ProgressCb,
): Promise<string> {
  const seg = await getSegmenter(model, useWebGPU, onProgress);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = base64;
  });

  const src = document.createElement("canvas");
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  src.getContext("2d")!.drawImage(img, 0, 0);
  const canvas = resizeIfNeeded(src, maxDim);

  onProgress?.({ stage: "segmenting", progress: 0.3, message: "Detecting subject…" });
  const result = await seg(canvas.toDataURL("image/png"));

  onProgress?.({ stage: "compositing", progress: 0.85, message: "Compositing alpha…" });
  const output = Array.isArray(result) ? result[0] : result;
  const mask = output?.mask ?? output;

  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const maskData: Uint8ClampedArray | Uint8Array | undefined = mask?.data ?? output?.data;

  if (maskData) {
    const len = canvas.width * canvas.height;
    for (let i = 0; i < len; i++) {
      imageData.data[i * 4 + 3] = maskData[i];
    }
    ctx.putImageData(imageData, 0, 0);
  }

  onProgress?.({ stage: "compositing", progress: 1, message: "Done" });
  return canvas.toDataURL("image/png");
}

/** Single-image background removal (back-compat with previous default model). */
export async function removeBackground(
  base64: string,
  onProgress?: ProgressCb,
): Promise<string> {
  return runRemoval(base64, "briaai/RMBG-1.4", DEFAULT_MAX_DIM, true, onProgress);
}

/** Batch-friendly entry with explicit model + options. */
export async function removeBackgroundBatch(
  base64: string,
  opts: BgRemoveOptions = {},
): Promise<string> {
  return runRemoval(
    base64,
    opts.model ?? "briaai/RMBG-1.4",
    opts.maxDim ?? DEFAULT_MAX_DIM,
    opts.useWebGPU ?? true,
    opts.onProgress,
  );
}
