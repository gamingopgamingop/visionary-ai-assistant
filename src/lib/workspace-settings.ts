/**
 * Persistent workspace settings (selected tab, prompt params, editor controls,
 * batch BG-removal options, last prompt).
 */
import { DEFAULT_PROMPT_PARAMS, type PromptParamsValue } from "@/components/PromptParams";

export interface WorkspaceSettings {
  activeTab: string;
  prompt: string;
  promptParams: PromptParamsValue;
  wasmEffect: string;
  editor: {
    width: string;
    height: string;
    rotate: "0" | "90" | "180" | "270";
    format: string;
    quality: string;
  };
  batchBg: {
    model: string;
    maxDim: string;
    useWebGPU: boolean;
  };
}

const KEY = "ait_workspace_settings_v1";

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  activeTab: "analyze",
  prompt: "",
  promptParams: DEFAULT_PROMPT_PARAMS,
  wasmEffect: "grayscale",
  editor: { width: "", height: "", rotate: "0", format: "image/png", quality: "0.9" },
  batchBg: { model: "briaai/RMBG-1.4", maxDim: "1024", useWebGPU: true },
};

export function loadSettings(): WorkspaceSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: WorkspaceSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* quota — ignore */ }
}

export function patchSettings(patch: Partial<WorkspaceSettings>) {
  saveSettings({ ...loadSettings(), ...patch });
}
