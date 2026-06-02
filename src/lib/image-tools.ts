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

/* ---------- Stitch (panorama-style concat) ---------- */
export async function stitchImages(
  sources: string[],
  direction: "horizontal" | "vertical" = "horizontal",
  gap = 0,
  background = "#000000",
): Promise<string> {
  if (!sources.length) throw new Error("Provide at least one image");
  const imgs = await Promise.all(sources.map(loadImg));
  let W = 0, H = 0;
  if (direction === "horizontal") {
    H = Math.max(...imgs.map((i) => i.naturalHeight));
    W = imgs.reduce((s, i) => s + Math.round((i.naturalWidth * H) / i.naturalHeight), 0) + gap * (imgs.length - 1);
  } else {
    W = Math.max(...imgs.map((i) => i.naturalWidth));
    H = imgs.reduce((s, i) => s + Math.round((i.naturalHeight * W) / i.naturalWidth), 0) + gap * (imgs.length - 1);
  }
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);
  let cursor = 0;
  for (const img of imgs) {
    if (direction === "horizontal") {
      const w = Math.round((img.naturalWidth * H) / img.naturalHeight);
      ctx.drawImage(img, cursor, 0, w, H);
      cursor += w + gap;
    } else {
      const h = Math.round((img.naturalHeight * W) / img.naturalWidth);
      ctx.drawImage(img, 0, cursor, W, h);
      cursor += h + gap;
    }
  }
  return c.toDataURL("image/png");
}

/* ---------- Pixel diff with heatmap ---------- */
export async function imageDiff(
  srcA: string,
  srcB: string,
  threshold = 20,
): Promise<{ dataUrl: string; diffPixels: number; totalPixels: number; pctDifferent: number }> {
  const [a, b] = await Promise.all([loadImg(srcA), loadImg(srcB)]);
  const W = Math.max(a.naturalWidth, b.naturalWidth);
  const H = Math.max(a.naturalHeight, b.naturalHeight);
  const mk = (img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d")!;
    x.drawImage(img, 0, 0, W, H);
    return x.getImageData(0, 0, W, H);
  };
  const A = mk(a), B = mk(b);
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const octx = out.getContext("2d")!;
  const oi = octx.createImageData(W, H);
  let diffPx = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const dr = A.data[i] - B.data[i];
    const dg = A.data[i + 1] - B.data[i + 1];
    const db = A.data[i + 2] - B.data[i + 2];
    const mag = Math.sqrt(dr * dr + dg * dg + db * db);
    if (mag > threshold) {
      diffPx++;
      // Heatmap: red intensity by magnitude
      const t = Math.min(1, mag / 255);
      oi.data[i] = 255;
      oi.data[i + 1] = Math.round(255 * (1 - t));
      oi.data[i + 2] = 0;
      oi.data[i + 3] = 200;
    } else {
      // Greyed-out base
      const lum = (A.data[i] + A.data[i + 1] + A.data[i + 2]) / 3;
      oi.data[i] = oi.data[i + 1] = oi.data[i + 2] = Math.round(lum * 0.4 + 100);
      oi.data[i + 3] = 255;
    }
  }
  octx.putImageData(oi, 0, 0);
  const total = W * H;
  return { dataUrl: out.toDataURL("image/png"), diffPixels: diffPx, totalPixels: total, pctDifferent: (diffPx / total) * 100 };
}

/* ---------- Perceptual hash (pHash via 32×32 DCT) ---------- */
function dct1d(v: number[]): number[] {
  const N = v.length;
  const out = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let n = 0; n < N; n++) s += v[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    out[k] = s;
  }
  return out;
}
export async function perceptualHash(src: string): Promise<string> {
  const img = await loadImg(src);
  const SIZE = 32;
  const c = document.createElement("canvas");
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const id = ctx.getImageData(0, 0, SIZE, SIZE);
  const grey: number[][] = [];
  for (let y = 0; y < SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      row.push(0.299 * id.data[i] + 0.587 * id.data[i + 1] + 0.114 * id.data[i + 2]);
    }
    grey.push(row);
  }
  const rows = grey.map(dct1d);
  const cols: number[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));
  for (let x = 0; x < SIZE; x++) {
    const col = rows.map((r) => r[x]);
    const d = dct1d(col);
    for (let y = 0; y < SIZE; y++) cols[y][x] = d[y];
  }
  // Take top-left 8×8, skip DC
  const block: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) block.push(cols[y][x]);
  const dc = block[0];
  const rest = block.slice(1);
  const sorted = [...rest].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let bits = "";
  for (const v of block) bits += v > median ? "1" : "0";
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  void dc;
  return hex;
}
export function hammingDistance(a: string, b: string): number {
  const aBits = BigInt("0x" + a);
  const bBits = BigInt("0x" + b);
  let x = aBits ^ bBits;
  let d = 0;
  while (x) { d += Number(x & 1n); x >>= 1n; }
  return d;
}

/* ---------- Text overlay ---------- */
export interface TextOverlayParams {
  text: string;
  font?: string;          // e.g. "Inter, sans-serif"
  size?: number;          // px
  color?: string;
  opacity?: number;       // 0..1
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  padding?: number;
  stroke?: boolean;
  strokeColor?: string;
}
export async function addTextOverlay(src: string, p: TextOverlayParams): Promise<string> {
  const img = await loadImg(src);
  const { c, ctx } = canvasFromImg(img);
  const size = p.size ?? Math.max(24, Math.round(c.height / 18));
  ctx.font = `bold ${size}px ${p.font ?? "system-ui, sans-serif"}`;
  ctx.fillStyle = p.color ?? "#ffffff";
  ctx.globalAlpha = p.opacity ?? 1;
  const pad = p.padding ?? 24;
  const m = ctx.measureText(p.text);
  let x = pad, y = pad + size;
  const pos = p.position ?? "bottom-right";
  if (pos.includes("right")) x = c.width - m.width - pad;
  if (pos.includes("bottom")) y = c.height - pad;
  if (pos === "center") { x = (c.width - m.width) / 2; y = (c.height + size) / 2; }
  if (p.stroke) {
    ctx.lineWidth = Math.max(2, size / 12);
    ctx.strokeStyle = p.strokeColor ?? "#000000";
    ctx.strokeText(p.text, x, y);
  }
  ctx.fillText(p.text, x, y);
  ctx.globalAlpha = 1;
  return c.toDataURL("image/png");
}

/* ---------- Metadata strip (re-encode loses EXIF) ---------- */
export async function stripMetadata(src: string, format: OutFormat = "image/png", quality = 0.95): Promise<{ dataUrl: string; bytes: number }> {
  return convertImage(src, format, quality);
}

