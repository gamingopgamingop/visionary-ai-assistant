/**
 * ONNX model loading with progress tracking + IndexedDB caching.
 * Fetches a model from a URL, reports progress (bytes/total), and caches the
 * ArrayBuffer in IndexedDB so subsequent loads are instant.
 */
import * as ort from "onnxruntime-web";

ort.env.wasm.numThreads = 1;

const DB_NAME = "ait-onnx-cache";
const STORE = "models";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCached(key: string): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function putCached(key: string, buf: ArrayBuffer) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(buf, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface LoadProgress {
  phase: "cache" | "download" | "init" | "ready";
  loaded: number;
  total: number;
  message: string;
}

const sessionCache = new Map<string, ort.InferenceSession>();

export async function loadModelWithProgress(
  url: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<ort.InferenceSession> {
  const cached = sessionCache.get(url);
  if (cached) {
    onProgress?.({ phase: "ready", loaded: 1, total: 1, message: "Cached" });
    return cached;
  }

  onProgress?.({ phase: "cache", loaded: 0, total: 1, message: "Checking cache…" });
  let buf = await getCached(url).catch(() => null);

  if (!buf) {
    onProgress?.({ phase: "download", loaded: 0, total: 1, message: "Fetching model…" });
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch model: ${resp.status}`);
    const total = Number(resp.headers.get("content-length")) || 0;
    const reader = resp.body!.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.({
        phase: "download",
        loaded,
        total,
        message: total
          ? `Downloading ${(loaded / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`
          : `Downloading ${(loaded / 1024 / 1024).toFixed(1)} MB`,
      });
    }
    const merged = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }
    buf = merged.buffer;
    putCached(url, buf).catch(() => {});
  } else {
    onProgress?.({ phase: "cache", loaded: 1, total: 1, message: "Loaded from cache" });
  }

  onProgress?.({ phase: "init", loaded: 0, total: 1, message: "Initializing runtime…" });
  const session = await ort.InferenceSession.create(buf, { executionProviders: ["wasm"] });
  sessionCache.set(url, session);
  onProgress?.({ phase: "ready", loaded: 1, total: 1, message: "Ready" });
  return session;
}

export async function clearOnnxCache(): Promise<{ idbCleared: boolean; transformersCleared: boolean; cachesCleared: number; sessionsCleared: number }> {
  const sessionsCleared = sessionCache.size;
  sessionCache.clear();

  // 1. Delete our own IndexedDB store entirely (stronger than .clear())
  let idbCleared = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
    idbCleared = true;
  } catch { /* ignore */ }

  // 2. Delete transformers.js IndexedDB caches
  let transformersCleared = false;
  try {
    if ("databases" in indexedDB) {
      const dbs = await (indexedDB as any).databases();
      for (const d of dbs) {
        if (d.name && /transformers|onnx|huggingface/i.test(d.name)) {
          await new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          });
        }
      }
      transformersCleared = true;
    }
  } catch { /* ignore */ }

  // 3. Delete CacheStorage entries used by transformers.js
  let cachesCleared = 0;
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        if (/transformers|onnx|huggingface|model/i.test(k)) {
          await caches.delete(k);
          cachesCleared++;
        }
      }
    }
  } catch { /* ignore */ }

  return { idbCleared, transformersCleared, cachesCleared, sessionsCleared };
}
