/**
 * Main-thread client for the image worker.
 * Lazily spawns a single worker and multiplexes jobs.
 * Supports progress messages and per-call cancellation via AbortSignal.
 */

let worker: Worker | null = null;
let seq = 0;

interface PendingEntry {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  onProgress?: (msg: string, pct?: number) => void;
}

const pending = new Map<string, PendingEntry>();

interface WorkerReply {
  id: string;
  ok?: boolean;
  result?: any;
  error?: string;
  progress?: { msg: string; pct?: number };
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/image-worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<WorkerReply>) => {
    const { id } = e.data;
    const entry = pending.get(id);
    if (!entry) return;
    if (e.data.progress) {
      entry.onProgress?.(e.data.progress.msg, e.data.progress.pct);
      return;
    }
    pending.delete(id);
    if (e.data.ok) entry.resolve(e.data.result);
    else entry.reject(new Error(e.data.error || "Worker error"));
  };
  return worker;
}

/** Terminates and clears the worker; in-flight jobs are rejected. Useful for global "cancel all". */
export function terminateWorker() {
  if (!worker) return;
  worker.terminate();
  worker = null;
  for (const [, entry] of pending) entry.reject(new Error("Worker terminated"));
  pending.clear();
}

async function dataUrlToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

interface CallOpts {
  signal?: AbortSignal;
  onProgress?: (msg: string, pct?: number) => void;
}

function call<T>(op: string, payload: any, transfer: Transferable[] = [], opts: CallOpts = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = `${++seq}`;
    pending.set(id, { resolve, reject, onProgress: opts.onProgress });
    if (opts.signal) {
      if (opts.signal.aborted) {
        pending.delete(id);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      opts.signal.addEventListener(
        "abort",
        () => {
          if (pending.has(id)) {
            pending.delete(id);
            // We can't actually cancel inside the worker mid-loop without cooperation,
            // but we drop the pending entry so the caller resolves promptly.
            reject(new DOMException("Aborted", "AbortError"));
          }
        },
        { once: true },
      );
    }
    getWorker().postMessage({ id, op, payload }, transfer);
  });
}

export async function workerPalette(dataUrl: string, k = 6, opts?: CallOpts) {
  const bitmap = await dataUrlToBitmap(dataUrl);
  return call<{ hex: string; rgb: [number, number, number]; count: number }[]>(
    "palette", { bitmap, k }, [bitmap], opts,
  );
}

export async function workerPhash(dataUrl: string, opts?: CallOpts) {
  const bitmap = await dataUrlToBitmap(dataUrl);
  return call<string>("phash", { bitmap }, [bitmap], opts);
}

export async function workerDiff(a: string, b: string, threshold = 20, opts?: CallOpts) {
  const [ba, bb] = await Promise.all([dataUrlToBitmap(a), dataUrlToBitmap(b)]);
  return call<{ changed: number; total: number; ratio: number }>(
    "diff", { a: ba, b: bb, threshold }, [ba, bb], opts,
  );
}
