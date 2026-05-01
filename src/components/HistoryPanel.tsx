import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2, X } from "lucide-react";
import { listHistory, deleteHistory, clearHistory, type HistoryItem } from "@/lib/history";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Props {
  refreshKey: number;
  onRestore: (item: HistoryItem) => void;
}

const HistoryPanel = ({ refreshKey, onRestore }: Props) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = () => setItems(listHistory());

  useEffect(() => {
    if (open) refresh();
  }, [open, refreshKey]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteHistory(id);
    refresh();
  };

  const handleClear = () => {
    clearHistory();
    refresh();
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
        <SheetHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle>Recent results</SheetTitle>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No history yet — your last 30 results will appear here.
            </p>
          ) : (
            <ul className="p-2 space-y-1">
              {items.map((it) => (
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
