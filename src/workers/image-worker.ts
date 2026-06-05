/// <reference lib="webworker" />
/**
 * Heavy-compute worker. Runs palette extraction, perceptual hashing,
 * and pixel diffs off the main thread to keep the UI at 60fps.
 *
 * Message shape: { id: string, op: string, payload: any }
 * Reply shape:   { id: string, ok: boolean, result?: any, error?: string }
 */

type Job =
  | { id: string; op: "palette"; payload: { bitmap: ImageBitmap; k?: number } }
  | { id: string; op: "phash"; payload: { bitmap: ImageBitmap } }
  | { id: string; op: "diff"; payload: { a: ImageBitmap; b: ImageBitmap; threshold?: number } };

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function palette(bitmap: ImageBitmap, k = 6) {
  const size = 128;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const cur = buckets.get(key);
    if (cur) { cur.r += r; cur.g += g; cur.b += b; cur.n++; }
    else buckets.set(key, { r, g, b, n: 1 });
  }
  return Array.from(buckets.values())
    .map((c) => ({ rgb: [c.r / c.n, c.g / c.n, c.b / c.n] as [number, number, number], count: c.n }))
    .sort((a, b) => b.count - a.count)
    .slice(0, k)
    .map((c) => ({ rgb: c.rgb, count: c.count, hex: rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]) }));
}

function phash(bitmap: ImageBitmap): string {
  const N = 32;
  const canvas = new OffscreenCanvas(N, N);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);
  const gray = new Float64Array(N * N);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  // Simple average hash on 8x8 downscale for speed.
  const M = 8;
  const block = N / M;
  const small = new Float64Array(M * M);
  for (let y = 0; y < M; y++) {
    for (let x = 0; x < M; x++) {
      let sum = 0;
      for (let dy = 0; dy < block; dy++)
        for (let dx = 0; dx < block; dx++)
          sum += gray[(y * block + dy) * N + (x * block + dx)];
      small[y * M + x] = sum / (block * block);
    }
  }
  const avg = small.reduce((a, b) => a + b, 0) / small.length;
  let bits = "";
  for (const v of small) bits += v > avg ? "1" : "0";
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

function diff(a: ImageBitmap, b: ImageBitmap, threshold = 20) {
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const ca = new OffscreenCanvas(w, h);
  const cb = new OffscreenCanvas(w, h);
  ca.getContext("2d")!.drawImage(a, 0, 0, w, h);
  cb.getContext("2d")!.drawImage(b, 0, 0, w, h);
  const da = ca.getContext("2d")!.getImageData(0, 0, w, h);
  const db = cb.getContext("2d")!.getImageData(0, 0, w, h);
  const out = new OffscreenCanvas(w, h);
  const oc = out.getContext("2d")!;
  const od = oc.createImageData(w, h);
  let changed = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const dr = Math.abs(da.data[i] - db.data[i]);
    const dg = Math.abs(da.data[i + 1] - db.data[i + 1]);
    const dbl = Math.abs(da.data[i + 2] - db.data[i + 2]);
    const dist = (dr + dg + dbl) / 3;
    if (dist > threshold) {
      od.data[i] = 255; od.data[i + 1] = 0; od.data[i + 2] = 0; od.data[i + 3] = 200;
      changed++;
    } else {
      od.data[i] = da.data[i]; od.data[i + 1] = da.data[i + 1];
      od.data[i + 2] = da.data[i + 2]; od.data[i + 3] = 80;
    }
  }
  oc.putImageData(od, 0, 0);
  return { changed, total: w * h, ratio: changed / (w * h) };
}

self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, op, payload } = e.data;
  try {
    let result: any;
    if (op === "palette") result = palette(payload.bitmap, payload.k);
    else if (op === "phash") result = phash(payload.bitmap);
    else if (op === "diff") result = diff(payload.a, payload.b, payload.threshold);
    else throw new Error(`Unknown op: ${op}`);
    (self as any).postMessage({ id, ok: true, result });
  } catch (err) {
    (self as any).postMessage({ id, ok: false, error: (err as Error).message });
  }
};

export {};
