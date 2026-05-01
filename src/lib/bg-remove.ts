/**
 * Client-side background removal using HuggingFace Transformers (RMBG-1.4).
 * Runs in-browser via WebGPU when available, falls back to WASM.
 */
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

const MAX_DIM = 1024;

let segmenter: any = null;

async function getSegmenter() {
  if (!segmenter) {
    try {
      segmenter = await pipeline("background-removal", "briaai/RMBG-1.4", {
        device: "webgpu",
      });
    } catch {
      segmenter = await pipeline("background-removal", "briaai/RMBG-1.4");
    }
  }
  return segmenter;
}

function resizeIfNeeded(canvas: HTMLCanvasElement) {
  let { width, height } = canvas;
  if (width <= MAX_DIM && height <= MAX_DIM) return canvas;
  const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  out.getContext("2d")!.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

export async function removeBackground(base64: string): Promise<string> {
  const seg = await getSegmenter();

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

  const result = await seg(canvas.toDataURL("image/png"));
  // result is an array of { mask, ... } or a RawImage with alpha; handle both.
  const output = Array.isArray(result) ? result[0] : result;
  const mask = output?.mask ?? output;

  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const maskData: Uint8ClampedArray | Uint8Array =
    mask?.data ?? output?.data;

  if (maskData) {
    // Single-channel mask: apply to alpha channel
    const len = canvas.width * canvas.height;
    for (let i = 0; i < len; i++) {
      imageData.data[i * 4 + 3] = maskData[i];
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL("image/png");
}
