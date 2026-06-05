/**
 * Main-thread client for the image worker.
 * Lazily spawns a single worker and multiplexes jobs.
 */

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<string, (msg: { ok: boolean; result?: any; error?: string }) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/image-worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<{ id: string; ok: boolean; result?: any; error?: string }>) => {
    const cb = pending.get(e.data.id);
    if (cb) { pending.delete(e.data.id); cb(e.data); }
  };
  return worker;
}

async function dataUrlToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

function call<T>(op: string, payload: any, transfer: Transferable[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = `${++seq}`;
    pending.set(id, (msg) => (msg.ok ? resolve(msg.result as T) : reject(new Error(msg.error))));
    getWorker().postMessage({ id, op, payload }, transfer);
  });
}

export async function workerPalette(dataUrl: string, k = 6) {
  const bitmap = await dataUrlToBitmap(dataUrl);
  return call<{ hex: string; rgb: [number, number, number]; count: number }[]>(
    "palette",
    { bitmap, k },
    [bitmap],
  );
}

export async function workerPhash(dataUrl: string) {
  const bitmap = await dataUrlToBitmap(dataUrl);
  return call<string>("phash", { bitmap }, [bitmap]);
}

export async function workerDiff(a: string, b: string, threshold = 20) {
  const [ba, bb] = await Promise.all([dataUrlToBitmap(a), dataUrlToBitmap(b)]);
  return call<{ changed: number; total: number; ratio: number }>(
    "diff",
    { a: ba, b: bb, threshold },
    [ba, bb],
  );
}
