/**
 * Lightweight client-side history of toolkit results.
 * Stored in localStorage with image thumbnails (max 200x200) to keep size bounded.
 */

const KEY = "ait_history_v1";
const MAX_ITEMS = 30;
const THUMB_SIZE = 220;

export interface HistoryItem {
  id: string;
  tool: string;
  toolLabel: string;
  createdAt: number;
  thumbnail: string | null; // small preview (data url) or null for text-only
  resultType: "image" | "text" | "palette";
  resultPreview: string; // short text snippet OR data url
  fullResult: string; // full content (data url or text)
  prompt?: string;
}

function read(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: HistoryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    // Storage full — drop oldest until it fits
    while (items.length > 1) {
      items.pop();
      try {
        localStorage.setItem(KEY, JSON.stringify(items));
        return;
      } catch {
        /* keep shrinking */
      }
    }
  }
}

async function makeThumbnail(dataUrl: string): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    const ratio = Math.min(THUMB_SIZE / img.naturalWidth, THUMB_SIZE / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth * ratio);
    const h = Math.round(img.naturalHeight * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

export async function addHistory(
  partial: Omit<HistoryItem, "id" | "createdAt" | "thumbnail" | "resultPreview"> & {
    resultPreview?: string;
  }
): Promise<HistoryItem> {
  const items = read();

  let thumbnail: string | null = null;
  let resultPreview = partial.resultPreview ?? "";

  if (partial.resultType === "image") {
    thumbnail = await makeThumbnail(partial.fullResult);
    resultPreview = thumbnail ?? "";
  } else if (partial.resultType === "text") {
    resultPreview = partial.fullResult.slice(0, 140);
  } else if (partial.resultType === "palette") {
    resultPreview = partial.fullResult.slice(0, 200);
  }

  const item: HistoryItem = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    thumbnail,
    resultPreview,
    ...partial,
  };

  items.unshift(item);
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  write(items);
  return item;
}

export function listHistory(): HistoryItem[] {
  return read();
}

export function deleteHistory(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}

/** Serialize the full history (including thumbnails + full results) for download. */
export function exportHistory(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      items: read(),
    },
    null,
    2,
  );
}

/** Serialize history as CSV (omits binary data; keeps metadata + text/prompt). */
export function exportHistoryCSV(): string {
  const items = read();
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ["id", "createdAt", "tool", "toolLabel", "resultType", "prompt", "preview"];
  const rows = items.map((it) =>
    [
      it.id,
      new Date(it.createdAt).toISOString(),
      it.tool,
      it.toolLabel,
      it.resultType,
      it.prompt ?? "",
      it.resultType === "text" ? it.resultPreview : it.resultType === "palette" ? it.fullResult : "[image]",
    ].map(esc).join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
