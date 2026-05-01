/**
 * Export utilities for converting result images between formats with quality control.
 */

export type ExportFormat = "png" | "jpeg" | "webp";

export async function downloadAs(
  dataUrl: string,
  format: ExportFormat,
  quality: number,
  filename = "result"
) {
  const mime = `image/${format}` as const;
  // Re-render through a canvas so format / quality conversions work for any source.
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  // For JPEG, paint white behind transparency
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  const out = canvas.toDataURL(mime, quality);
  const a = document.createElement("a");
  a.href = out;
  a.download = `${filename}.${format}`;
  a.click();
}
