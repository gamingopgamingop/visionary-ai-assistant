import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PromptParamsValue {
  style: string;
  aspect: string;
  quality: string;
}

export const DEFAULT_PROMPT_PARAMS: PromptParamsValue = {
  style: "none",
  aspect: "1:1",
  quality: "standard",
};

const styles = [
  { value: "none", label: "No style (literal prompt)" },
  { value: "photorealistic", label: "Photorealistic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "anime", label: "Anime" },
  { value: "oil_painting", label: "Oil painting" },
  { value: "watercolor", label: "Watercolor" },
  { value: "3d_render", label: "3D render" },
  { value: "pixel_art", label: "Pixel art" },
  { value: "line_art", label: "Line art" },
  { value: "minimalist", label: "Minimalist" },
];

const aspects = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"];

const qualities = [
  { value: "draft", label: "Draft (fast)" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High detail" },
];

interface Props {
  value: PromptParamsValue;
  onChange: (v: PromptParamsValue) => void;
}

const PromptParams = ({ value, onChange }: Props) => {
  const set = <K extends keyof PromptParamsValue>(k: K, v: PromptParamsValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label className="text-xs">Style</Label>
        <Select value={value.style} onValueChange={(v) => set("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {styles.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Aspect</Label>
        <Select value={value.aspect} onValueChange={(v) => set("aspect", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {aspects.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Quality</Label>
        <Select value={value.quality} onValueChange={(v) => set("quality", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {qualities.map((q) => (
              <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default PromptParams;
