/**
 * Client-side background removal using HuggingFace Transformers (RMBG-1.4).
 * Runs in-browser via WebGPU when available, falls back to WASM.
 */
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

const MAX_DIM = 1024;

let segmenter: any = null;
let loadPromise: Promise<any> | null = null;

export type ProgressCb = (info: {
  stage: "loading-model" | "segmenting" | "compositing";
  progress: number; // 0-1
  message?: string;
}) => void;

async function getSegmenter(onProgress?: ProgressCb) {
  if (segmenter) return segmenter;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const progressCallback = (data: any) => {
      if (data?.status === "progress" && data?.progress != null) {
        onProgress?.({
          stage: "loading-model",
          progress: Math.min(0.95, (data.progress as number) / 100),
          message: data.file ?? "Downloading model",
        });
      }
    };
    try {
      segmenter = await pipeline("background-removal", "briaai/RMBG-1.4", {
        device: "webgpu",
        progress_callback: progressCallback,
      });
    } catch {
      segmenter = await pipeline("background-removal", "briaai/RMBG-1.4", {
        progress_callback: progressCallback,
      });
    }
    onProgress?.({ stage: "loading-model", progress: 1, message: "Model ready" });
    return segmenter;
  })();

  return loadPromise;
}

function resizeIfNeeded(canvas: HTMLCanvasElement) {
  const { width, height } = canvas;
  if (width <= MAX_DIM && height <= MAX_DIM) return canvas;
  const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  out.getContext("2d")!.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

export async function removeBackground(
  base64: string,
  onProgress?: ProgressCb
): Promise<string> {
  const seg = await getSegmenter(onProgress);

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
  const canvas = resizeIfNeeded(src);

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
