import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { presetsFor, type PromptPreset } from "@/lib/prompt-presets";

interface Props {
  tool: "generate" | "style" | "inpaint" | "enhance";
  onPick: (prompt: string) => void;
}

const PromptPresetPicker = ({ tool, onPick }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const all = presetsFor(tool);
    const filtered = query
      ? all.filter(
          (p) =>
            p.label.toLowerCase().includes(query.toLowerCase()) ||
            p.prompt.toLowerCase().includes(query.toLowerCase()),
        )
      : all;
    return filtered.reduce<Record<string, PromptPreset[]>>((acc, p) => {
      (acc[p.category] ||= []).push(p);
      return acc;
    }, {});
  }, [tool, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Presets
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="p-2 border-b">
          <Input
            placeholder="Search presets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="max-h-72">
          {Object.keys(groups).length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">No matches.</p>
          ) : (
            <div className="p-2 space-y-3">
              {Object.entries(groups).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground px-2 mb-1">
                    {cat}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => {
                            onPick(p.prompt);
                            setOpen(false);
                          }}
                          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors"
                        >
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.prompt}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default PromptPresetPicker;
