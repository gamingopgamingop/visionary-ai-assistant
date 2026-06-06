/**
 * Pipeline = ordered chain of image operations, persisted to localStorage.
 * Each step references a registered op by id. Ops are pure async functions that
 * take a dataURL and params and return a dataURL.
 */

import { editImage, type ImageFormat } from "./basic-editor";
import { applyWasmEffect, type WasmEffect } from "./wasm-image";
import { removeBackground } from "./bg-remove";

export interface PipelineStep {
  id: string;
  opId: string;
  params: Record<string, any>;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
  createdAt: number;
  updatedAt: number;
}

export interface OpDescriptor {
  id: string;
  label: string;
  category: "Editing" | "Effect" | "AI" | "Export";
  defaults: Record<string, any>;
  run: (input: string, params: Record<string, any>, onProgress?: (msg: string) => void) => Promise<string>;
}

export const OPS: OpDescriptor[] = [
  {
    id: "resize",
    label: "Resize",
    category: "Editing",
    defaults: { width: 1024, height: 0 },
    async run(input, p) {
      return editImage(input, {
        width: p.width || undefined,
        height: p.height || undefined,
        rotate: 0,
        format: "image/png",
        quality: 0.92,
      });
    },
  },
  {
    id: "rotate",
    label: "Rotate",
    category: "Editing",
    defaults: { degrees: 90 },
    async run(input, p) {
      const deg = ((p.degrees ?? 0) % 360 + 360) % 360;
      const safe = (deg === 90 || deg === 180 || deg === 270 ? deg : 0) as 0 | 90 | 180 | 270;
      return editImage(input, { rotate: safe, format: "image/png", quality: 0.92 });
    },
  },
  {
    id: "convert",
    label: "Convert format",
    category: "Export",
    defaults: { format: "image/webp", quality: 0.85 },
    async run(input, p) {
      return editImage(input, { format: p.format as ImageFormat, quality: p.quality ?? 0.85 });
    },
  },
  {
    id: "wasm",
    label: "WASM effect",
    category: "Effect",
    defaults: { effect: "grayscale" },
    async run(input, p) {
      return applyWasmEffect(input, p.effect as WasmEffect);
    },
  },
  {
    id: "bgRemove",
    label: "Remove background",
    category: "AI",
    defaults: {},
    async run(input, _p, onProgress) {
      onProgress?.("Removing background...");
      return removeBackground(input);
    },
  },
];

export const OP_MAP: Record<string, OpDescriptor> = Object.fromEntries(OPS.map((o) => [o.id, o]));

const KEY = "ait_pipelines_v1";

export function listPipelines(): Pipeline[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Pipeline[];
  } catch {
    return [];
  }
}

export function savePipeline(p: Pipeline) {
  const all = listPipelines();
  const idx = all.findIndex((x) => x.id === p.id);
  if (idx >= 0) all[idx] = { ...p, updatedAt: Date.now() };
  else all.push({ ...p, updatedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deletePipeline(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listPipelines().filter((p) => p.id !== id)));
}

export function newPipeline(name = "Untitled pipeline"): Pipeline {
  return { id: crypto.randomUUID(), name, steps: [], createdAt: Date.now(), updatedAt: Date.now() };
}

/** Built-in starter templates. Users can clone and customise. */
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  steps: Omit<PipelineStep, "id">[];
}

export const TEMPLATES: PipelineTemplate[] = [
  {
    id: "web-optimize",
    name: "Web optimize",
    description: "Resize to 1600px wide and re-encode as quality-85 WebP.",
    steps: [
      { opId: "resize", params: { width: 1600, height: 0 } },
      { opId: "convert", params: { format: "image/webp", quality: 0.85 } },
    ],
  },
  {
    id: "social-square",
    name: "Social square",
    description: "1080×1080 JPEG, ready for Instagram / LinkedIn.",
    steps: [
      { opId: "resize", params: { width: 1080, height: 1080 } },
      { opId: "convert", params: { format: "image/jpeg", quality: 0.9 } },
    ],
  },
  {
    id: "thumbnail",
    name: "Thumbnail",
    description: "Tiny 320px preview as WebP.",
    steps: [
      { opId: "resize", params: { width: 320, height: 0 } },
      { opId: "convert", params: { format: "image/webp", quality: 0.8 } },
    ],
  },
  {
    id: "cutout",
    name: "Background cutout",
    description: "Remove background then export as PNG with transparency.",
    steps: [
      { opId: "bgRemove", params: {} },
      { opId: "convert", params: { format: "image/png", quality: 1 } },
    ],
  },
  {
    id: "noir",
    name: "Noir",
    description: "Grayscale + compressed WebP.",
    steps: [
      { opId: "wasm", params: { effect: "grayscale" } },
      { opId: "convert", params: { format: "image/webp", quality: 0.85 } },
    ],
  },
];

export function pipelineFromTemplate(t: PipelineTemplate): Pipeline {
  return {
    id: crypto.randomUUID(),
    name: t.name,
    description: t.description,
    steps: t.steps.map((s) => ({ ...s, id: crypto.randomUUID(), params: { ...s.params } })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export class PipelineCancelled extends Error {
  constructor() { super("Pipeline cancelled"); this.name = "PipelineCancelled"; }
}

export interface RunOptions {
  signal?: AbortSignal;
  onStep?: (i: number, total: number, op: OpDescriptor) => void;
  onProgress?: (msg: string) => void;
}

export async function runPipeline(
  pipeline: Pipeline,
  input: string,
  optsOrOnStep?: RunOptions | ((i: number, total: number, op: OpDescriptor) => void),
  legacyOnProgress?: (msg: string) => void,
): Promise<string> {
  // Back-compat: callers used to pass (onStep, onProgress).
  const opts: RunOptions =
    typeof optsOrOnStep === "function"
      ? { onStep: optsOrOnStep, onProgress: legacyOnProgress }
      : optsOrOnStep ?? {};

  let current = input;
  for (let i = 0; i < pipeline.steps.length; i++) {
    if (opts.signal?.aborted) throw new PipelineCancelled();
    const step = pipeline.steps[i];
    const op = OP_MAP[step.opId];
    if (!op) continue;
    opts.onStep?.(i, pipeline.steps.length, op);
    current = await op.run(current, step.params, opts.onProgress);
  }
  if (opts.signal?.aborted) throw new PipelineCancelled();
  return current;
}
