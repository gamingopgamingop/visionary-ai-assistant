import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import { ONNX_MODELS, type OnnxModelEntry } from "@/lib/onnx-models";
import { usePersistedState } from "@/hooks/use-persisted-state";

export interface OnnxSelection {
  path: string;
  inputName: string;
  inputShape: number[];
  label: string;
}

interface Props {
  onChange: (sel: OnnxSelection) => void;
}

const OnnxModelPicker = ({ onChange }: Props) => {
  const [selectedId, setSelectedId] = usePersistedState<string>("ait_onnx_model", ONNX_MODELS[0].id);
  const [customUrl, setCustomUrl] = usePersistedState<string>("ait_onnx_url", "");
  const [customInput, setCustomInput] = usePersistedState<string>("ait_onnx_input", "input");
  const [customShape, setCustomShape] = usePersistedState<string>("ait_onnx_shape", "1,3,224,224");
  const [uploadedName, setUploadedName] = useState<string>("");
  const blobUrlRef = useRef<string | null>(null);

  const apply = (entry: OnnxModelEntry | null, override?: Partial<OnnxSelection>) => {
    const sel: OnnxSelection = entry
      ? { path: entry.path, inputName: entry.inputName, inputShape: entry.inputShape, label: entry.label }
      : {
          path: override?.path ?? customUrl,
          inputName: override?.inputName ?? customInput,
          inputShape: override?.inputShape ?? customShape.split(",").map((s) => parseInt(s.trim()) || 1),
          label: override?.label ?? "Custom",
        };
    onChange(sel);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (id === "__custom_url") apply(null);
    else if (id === "__custom_file") return;
    else {
      const entry = ONNX_MODELS.find((m) => m.id === id);
      if (entry) apply(entry);
    }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setUploadedName(file.name);
    setSelectedId("__custom_file");
    apply(null, {
      path: url,
      inputName: customInput,
      inputShape: customShape.split(",").map((s) => parseInt(s.trim()) || 1),
      label: file.name,
    });
  };

  const isCustom = selectedId === "__custom_url" || selectedId === "__custom_file";

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Model</Label>
        <Select value={selectedId} onValueChange={handleSelect}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ONNX_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex flex-col">
                  <span>{m.label}</span>
                  {m.note && <span className="text-[10px] text-muted-foreground">{m.note}</span>}
                </div>
              </SelectItem>
            ))}
            <SelectItem value="__custom_url">Custom URL…</SelectItem>
            <SelectItem value="__custom_file">Upload .onnx file…</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedId === "__custom_url" && (
        <div>
          <Label className="text-xs">Model URL (.onnx)</Label>
          <Input
            value={customUrl}
            placeholder="https://… or /models/my-model.onnx"
            onChange={(e) => setCustomUrl(e.target.value)}
            onBlur={() => apply(null)}
          />
        </div>
      )}

      {selectedId === "__custom_file" && (
        <label className="flex items-center justify-center gap-2 border border-dashed rounded-md py-3 text-xs cursor-pointer hover:bg-muted/40">
          <Upload className="h-3.5 w-3.5" />
          {uploadedName || "Choose .onnx file…"}
          <input
            type="file"
            accept=".onnx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      {isCustom && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Input name</Label>
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onBlur={() => apply(null)}
            />
          </div>
          <div>
            <Label className="text-xs">Input shape</Label>
            <Input
              value={customShape}
              placeholder="1,3,224,224"
              onChange={(e) => setCustomShape(e.target.value)}
              onBlur={() => apply(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OnnxModelPicker;
