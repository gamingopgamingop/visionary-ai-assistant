/**
 * Extract dominant colors from an image using k-means-style quantization.
 * Pure client-side, no dependencies.
 */

export interface PaletteColor {
  hex: string;
  rgb: [number, number, number];
  count: number;
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

export async function extractPalette(
  base64: string,
  k = 6
): Promise<PaletteColor[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = base64;
  });

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  // Quantize to 4 bits per channel for grouping
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const cur = buckets.get(key);
    if (cur) {
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const palette = Array.from(buckets.values())
    .map((c) => ({
      rgb: [c.r / c.n, c.g / c.n, c.b / c.n] as [number, number, number],
      count: c.n,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, k)
    .map((c) => ({
      rgb: c.rgb,
      count: c.count,
      hex: rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]),
    }));

  return palette;
}
