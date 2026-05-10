/**
 * Helpers for exporting face/object detection metadata and similarity reports.
 */
import type { Box } from "@/lib/draw-boxes";

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function facesToJSON(
  boxes: Box[],
  customLabels: Record<number, string>,
  meta: { model: string; threshold: number; imageWidth?: number; imageHeight?: number },
) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      model: meta.model,
      threshold: meta.threshold,
      imageWidth: meta.imageWidth,
      imageHeight: meta.imageHeight,
      count: boxes.length,
      detections: boxes.map((b, i) => ({
        index: i + 1,
        label: b.label,
        customLabel: customLabels[i] ?? null,
        score: b.score,
        box: b.box,
        width: b.box.xmax - b.box.xmin,
        height: b.box.ymax - b.box.ymin,
      })),
    },
    null,
    2,
  );
}

export function facesToCSV(boxes: Box[], customLabels: Record<number, string>) {
  const headers = ["index", "label", "customLabel", "score", "xmin", "ymin", "xmax", "ymax", "width", "height"];
  const rows = boxes.map((b, i) => [
    i + 1,
    b.label,
    customLabels[i] ?? "",
    b.score.toFixed(4),
    b.box.xmin.toFixed(2),
    b.box.ymin.toFixed(2),
    b.box.xmax.toFixed(2),
    b.box.ymax.toFixed(2),
    (b.box.xmax - b.box.xmin).toFixed(2),
    (b.box.ymax - b.box.ymin).toFixed(2),
  ]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function similarityToCSV(ranked: { url: string; sim: number }[]) {
  const rows = ranked.map((r, i) => [i + 1, r.sim.toFixed(6), (r.sim * 100).toFixed(2) + "%"]);
  return ["rank,cosine,percent", ...rows.map((r) => r.join(","))].join("\n");
}

export function similarityToJSON(ranked: { url: string; sim: number }[]) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: ranked.length,
      results: ranked.map((r, i) => ({ rank: i + 1, cosine: r.sim, percent: r.sim * 100 })),
    },
    null,
    2,
  );
}
