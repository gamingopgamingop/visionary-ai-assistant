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
  else all.push(p);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deletePipeline(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listPipelines().filter((p) => p.id !== id)));
}

export function newPipeline(name = "Untitled pipeline"): Pipeline {
  return { id: crypto.randomUUID(), name, steps: [], createdAt: Date.now(), updatedAt: Date.now() };
}

export async function runPipeline(
  pipeline: Pipeline,
  input: string,
  onStep?: (i: number, total: number, op: OpDescriptor) => void,
  onProgress?: (msg: string) => void,
): Promise<string> {
  let current = input;
  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    const op = OP_MAP[step.opId];
    if (!op) continue;
    onStep?.(i, pipeline.steps.length, op);
    current = await op.run(current, step.params, onProgress);
  }
  return current;
}
