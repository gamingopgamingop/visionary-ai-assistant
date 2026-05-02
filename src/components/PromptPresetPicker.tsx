import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Plus, Trash2, Pencil } from "lucide-react";
import {
  presetsFor, upsertCustomPreset, deleteCustomPreset,
  type PromptPreset, type PresetTool,
} from "@/lib/prompt-presets";
import { toast } from "sonner";

interface Props {
  tool: PresetTool;
  onPick: (prompt: string) => void;
}

const blank = (tool: PresetTool): PromptPreset => ({
  id: `custom-${Date.now()}`,
  label: "",
  prompt: "",
  category: "Custom",
  appliesTo: [tool],
  custom: true,
});

const PromptPresetPicker = ({ tool, onPick }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<PromptPreset>(() => blank(tool));
  const [version, setVersion] = useState(0);

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
  }, [tool, query, version]);

  const startNew = () => {
    setDraft(blank(tool));
    setEditorOpen(true);
  };

  const startEdit = (p: PromptPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft({ ...p });
    setEditorOpen(true);
  };

  const handleDelete = (p: PromptPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomPreset(p.id);
    setVersion((v) => v + 1);
    toast.success("Preset deleted");
  };

  const handleSave = () => {
    if (!draft.label.trim() || !draft.prompt.trim()) {
      toast.error("Name and prompt are required");
      return;
    }
    upsertCustomPreset(draft);
    setVersion((v) => v + 1);
    setEditorOpen(false);
    toast.success("Preset saved");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Presets
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="p-2 border-b flex gap-2">
            <Input
              placeholder="Search presets…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 flex-1"
            />
            <Button size="sm" variant="ghost" onClick={startNew} className="h-8 px-2">
              <Plus className="h-4 w-4" />
            </Button>
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
                        <li key={p.id} className="group">
                          <button
                            onClick={() => {
                              onPick(p.prompt);
                              setOpen(false);
                            }}
                            className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors flex items-start gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium flex items-center gap-1.5">
                                {p.label}
                                {p.custom && (
                                  <span className="text-[9px] uppercase rounded bg-primary/10 text-primary px-1 py-0.5">
                                    custom
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{p.prompt}</div>
                            </div>
                            {p.custom && (
                              <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                                <span
                                  onClick={(e) => startEdit(p, e)}
                                  className="text-muted-foreground hover:text-foreground p-0.5"
                                >
                                  <Pencil className="h-3 w-3" />
                                </span>
                                <span
                                  onClick={(e) => handleDelete(p, e)}
                                  className="text-muted-foreground hover:text-destructive p-0.5"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </span>
                              </span>
                            )}
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.custom && draft.label ? "Edit preset" : "New preset"}</DialogTitle>
            <DialogDescription>Save a reusable prompt for this tool.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="e.g. Brand product shot"
              />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Custom"
              />
            </div>
            <div>
              <Label className="text-xs">Prompt</Label>
              <Textarea
                value={draft.prompt}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromptPresetPicker;
