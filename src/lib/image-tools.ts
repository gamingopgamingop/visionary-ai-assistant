/**
 * Pure client-side image utilities: adjust, filters, histogram, convert/compress, redact, crop.
 * All take a base64/data-URL string and return a data URL.
 */

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function canvasFromImg(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return { c, ctx };
}

export interface AdjustParams {
  brightness: number; // -100..100
  contrast: number;   // -100..100
  saturation: number; // -100..100
  hue: number;        // -180..180
  blur: number;       // 0..20 (px)
  sharpness: number;  // 0..100 (uses contrast-ish + filter)
}

export const DEFAULT_ADJUST: AdjustParams = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, sharpness: 0,
};

export async function applyAdjust(src: string, p: AdjustParams): Promise<string> {
  const img = await loadImg(src);
  const { c, ctx } = canvasFromImg(img);
  const parts = [
    `brightness(${1 + p.brightness / 100})`,
    `contrast(${1 + p.contrast / 100})`,
    `saturate(${1 + p.saturation / 100})`,
    `hue-rotate(${p.hue}deg)`,
    p.blur > 0 ? `blur(${p.blur}px)` : "",
  ].filter(Boolean).join(" ");
  ctx.clearRect(0, 0, c.width, c.height);
  (ctx as any).filter = parts || "none";
  ctx.drawImage(img, 0, 0);
  (ctx as any).filter = "none";

  if (p.sharpness > 0) {
    // Simple unsharp mask via convolution
    const amount = p.sharpness / 100;
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const out = ctx.createImageData(c.width, c.height);
    const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    const w = c.width, h = c.height;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let ch = 0; ch < 3; ch++) {
          let s = 0, ki = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * w + (x + kx)) * 4 + ch;
              s += id.data[idx] * k[ki++];
            }
          }
          const oi = (y * w + x) * 4 + ch;
          out.data[oi] = Math.max(0, Math.min(255, id.data[oi] * (1 - amount) + s * amount));
        }
        out.data[(y * w + x) * 4 + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }
  return c.toDataURL("image/png");
}

export type FilterPreset =
  | "none" | "vintage" | "cinematic" | "bw" | "warm" | "cool"
  | "fade" | "vivid" | "sepia" | "noir" | "dramatic" | "lomo";

const FILTER_CSS: Record<FilterPreset, string> = {
  none: "none",
  vintage: "sepia(0.5) contrast(1.1) brightness(1.05) saturate(0.8)",
  cinematic: "contrast(1.3) saturate(1.1) brightness(0.95)",
  bw: "grayscale(1) contrast(1.1)",
  warm: "saturate(1.2) hue-rotate(-10deg) brightness(1.05)",
  cool: "saturate(1.1) hue-rotate(15deg)",
  fade: "contrast(0.85) saturate(0.7) brightness(1.1)",
  vivid: "saturate(1.6) contrast(1.15)",
  sepia: "sepia(0.9)",
  noir: "grayscale(1) contrast(1.5) brightness(0.85)",
  dramatic: "contrast(1.4) saturate(1.3) brightness(0.9)",
  lomo: "saturate(1.4) contrast(1.3) hue-rotate(-5deg)",
};

export const FILTER_PRESETS: { value: FilterPreset; label: string }[] = [
  { value: "vintage", label: "Vintage" },
  { value: "cinematic", label: "Cinematic" },
  { value: "bw", label: "Black & White" },
  { value: "noir", label: "Noir" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "fade", label: "Fade" },
  { value: "vivid", label: "Vivid" },
  { value: "sepia", label: "Sepia" },
  { value: "dramatic", label: "Dramatic" },
  { value: "lomo", label: "Lomo" },
];

export async function applyFilter(src: string, preset: FilterPreset): Promise<string> {
  const img = await loadImg(src);
  const { c, ctx } = canvasFromImg(img);
  ctx.clearRect(0, 0, c.width, c.height);
  (ctx as any).filter = FILTER_CSS[preset];
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/png");
}

/** Render an RGB+luminance histogram as a PNG data URL. */
export async function renderHistogram(src: string): Promise<{ dataUrl: string; stats: { r: number[]; g: number[]; b: number[]; lum: number[] } }> {
  const img = await loadImg(src);
  const { c, ctx } = canvasFromImg(img);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const lum = new Array(256).fill(0);
  for (let i = 0; i < id.data.length; i += 4) {
    r[id.data[i]]++;
    g[id.data[i + 1]]++;
    b[id.data[i + 2]]++;
    const L = Math.round(0.2126 * id.data[i] + 0.7152 * id.data[i + 1] + 0.0722 * id.data[i + 2]);
    lum[L]++;
  }
  const W = 768, H = 320, pad = 30;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const cx = cv.getContext("2d")!;
  cx.fillStyle = "#0a0a0a";
  cx.fillRect(0, 0, W, H);
  cx.fillStyle = "#fff";
  cx.font = "12px system-ui";
  cx.fillText("RGB + Luminance histogram", pad, 18);
  const max = Math.max(...r, ...g, ...b, ...lum);
  const drawSeries = (arr: number[], color: string) => {
    cx.strokeStyle = color;
    cx.globalAlpha = 0.7;
    cx.beginPath();
    for (let x = 0; x < 256; x++) {
      const px = pad + (x / 255) * (W - pad * 2);
      const h = ((arr[x] / max) * (H - pad * 2));
      cx.moveTo(px, H - pad);
      cx.lineTo(px, H - pad - h);
    }
    cx.stroke();
    cx.globalAlpha = 1;
  };
  drawSeries(r, "#ff4d4d");
  drawSeries(g, "#4dff7a");
  drawSeries(b, "#4d8aff");
  drawSeries(lum, "#ffffff");
  cx.fillStyle = "#999";
  cx.fillText("0", pad, H - 10);
  cx.fillText("255", W - pad - 20, H - 10);
  return { dataUrl: cv.toDataURL("image/png"), stats: { r, g, b, lum } };
}

export type OutFormat = "image/png" | "image/jpeg" | "image/webp";

export async function convertImage(
  src: string,
  format: OutFormat,
  quality: number,
  resizeW?: number,
  resizeH?: number,
): Promise<{ dataUrl: string; bytes: number }> {
  const img = await loadImg(src);
  const w = resizeW || img.naturalWidth;
  const h = resizeH || img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = c.toDataURL(format, quality);
  const bytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 3 / 4);
  return { dataUrl, bytes };
}

/** Compress to roughly a target byte size by binary-searching quality. */
export async function compressToSize(
  src: string,
  targetBytes: number,
  format: "image/jpeg" | "image/webp" = "image/jpeg",
): Promise<{ dataUrl: string; bytes: number; quality: number }> {
  let lo = 0.05, hi = 0.98, best = await convertImage(src, format, hi, undefined, undefined);
  let bestQ = hi;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const r = await convertImage(src, format, mid);
    if (r.bytes > targetBytes) { hi = mid; }
    else { lo = mid; if (r.bytes > best.bytes * 0.5 || best.bytes > targetBytes) { best = r; bestQ = mid; } }
  }
  return { ...best, quality: bestQ };
}

/** Redact rectangular regions with solid black or blur. */
export async function redactRegions(
  src: string,
  regions: { x: number; y: number; w: number; h: number }[],
  mode: "black" | "blur" | "pixelate" = "black",
): Promise<string> {
  const img = await loadImg(src);
  const { c, ctx } = canvasFromImg(img);
  for (const r of regions) {
    if (mode === "black") {
      ctx.fillStyle = "#000";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    } else if (mode === "blur") {
      (ctx as any).filter = "blur(18px)";
      ctx.drawImage(c, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
      (ctx as any).filter = "none";
    } else {
      // pixelate
      const block = Math.max(8, Math.min(r.w, r.h) / 12);
      const tmp = document.createElement("canvas");
      tmp.width = Math.max(1, Math.floor(r.w / block));
      tmp.height = Math.max(1, Math.floor(r.h / block));
      const tctx = tmp.getContext("2d")!;
      tctx.drawImage(c, r.x, r.y, r.w, r.h, 0, 0, tmp.width, tmp.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, r.x, r.y, r.w, r.h);
      ctx.imageSmoothingEnabled = true;
    }
  }
  return c.toDataURL("image/png");
}
