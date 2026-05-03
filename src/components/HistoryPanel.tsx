import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { History, Trash2, X, Download, Search } from "lucide-react";
import { listHistory, deleteHistory, clearHistory, exportHistory, exportHistoryCSV, type HistoryItem } from "@/lib/history";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Props {
  refreshKey: number;
  onRestore: (item: HistoryItem) => void;
}

const HistoryPanel = ({ refreshKey, onRestore }: Props) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | HistoryItem["resultType"]>("all");

  const refresh = () => setItems(listHistory());

  useEffect(() => {
    if (open) refresh();
  }, [open, refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (typeFilter !== "all" && it.resultType !== typeFilter) return false;
      if (!q) return true;
      return (
        it.toolLabel.toLowerCase().includes(q) ||
        it.tool.toLowerCase().includes(q) ||
        (it.prompt ?? "").toLowerCase().includes(q) ||
        (it.resultType === "text" && it.resultPreview.toLowerCase().includes(q))
      );
    });
  }, [items, query, typeFilter]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteHistory(id);
    refresh();
  };

  const handleClear = () => {
    clearHistory();
    refresh();
  };

  const handleExport = () => {
    const blob = new Blob([exportHistory()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ait-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <History className="h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <SheetTitle>Recent results</SheetTitle>
            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleExport} className="text-muted-foreground">
                    <Download className="h-3.5 w-3.5 mr-1" /> Export
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                </>
              )}
            </div>
          </div>
          {items.length > 0 && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by tool, prompt…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 pl-7"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="palette">Palette</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No history yet — your last 30 results will appear here.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No results match your search.
            </p>
          ) : (
            <ul className="p-2 space-y-1">
              {filtered.map((it) => (
                <li
                  key={it.id}
                  onClick={() => {
                    onRestore(it);
                    setOpen(false);
                  }}
                  className="group flex gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/60 transition-colors"
                >
                  <div className="h-14 w-14 shrink-0 rounded border bg-muted/40 overflow-hidden flex items-center justify-center">
                    {it.thumbnail ? (
                      <img src={it.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground uppercase">{it.resultType}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{it.toolLabel}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(it.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {it.prompt || (it.resultType === "text" ? it.resultPreview : it.resultType)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, it.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    aria-label="Delete"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default HistoryPanel;
