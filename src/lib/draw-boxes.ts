/**
 * Draw bounding boxes with labels onto an image and return a data URL.
 */
export interface Box {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export async function drawBoxesOnImage(base64: string, boxes: Box[]): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = base64;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const lineW = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / 250));
  const fontSize = Math.max(12, Math.round(Math.min(canvas.width, canvas.height) / 50));
  ctx.lineWidth = lineW;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = "top";

  for (const b of boxes) {
    const { xmin, ymin, xmax, ymax } = b.box;
    const w = xmax - xmin;
    const h = ymax - ymin;
    ctx.strokeStyle = "#22d3ee";
    ctx.strokeRect(xmin, ymin, w, h);

    const text = `${b.label} ${(b.score * 100).toFixed(0)}%`;
    const tw = ctx.measureText(text).width + 8;
    const th = fontSize + 6;
    ctx.fillStyle = "rgba(34, 211, 238, 0.9)";
    ctx.fillRect(xmin, Math.max(0, ymin - th), tw, th);
    ctx.fillStyle = "#0b1220";
    ctx.fillText(text, xmin + 4, Math.max(0, ymin - th) + 3);
  }

  return canvas.toDataURL("image/png");
}
