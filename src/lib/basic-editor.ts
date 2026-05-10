/**
 * Client-side basic image editor: resize, rotate, format conversion, quality.
 */

export type ImageFormat = "image/png" | "image/jpeg" | "image/webp";

export interface EditOptions {
  width?: number;
  height?: number;
  rotate?: 0 | 90 | 180 | 270;
  format?: ImageFormat;
  quality?: number; // 0-1
}

export async function editImage(
  base64: string,
  opts: EditOptions
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = base64;
  });

  const rotate = opts.rotate ?? 0;
  const targetW = opts.width ?? img.naturalWidth;
  const targetH = opts.height ?? img.naturalHeight;

  const swap = rotate === 90 || rotate === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? targetH : targetW;
  canvas.height = swap ? targetW : targetH;
  const ctx = canvas.getContext("2d")!;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);

  const format = opts.format ?? "image/png";
  const quality = opts.quality ?? 0.9;
  return canvas.toDataURL(format, quality);
}
