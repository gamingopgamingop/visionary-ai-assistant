import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function UpgradeModal({
  open, onOpenChange, currentPlan, used, limit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPlan: string;
  used: number;
  limit: number;
}) {
  const nav = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daily limit reached</DialogTitle>
          <DialogDescription>
            You've used {used} / {limit} {currentPlan.toUpperCase()} generations today. Upgrade for higher limits and priority processing.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Maybe later</Button>
          <Button onClick={() => { onOpenChange(false); nav("/pricing"); }}>View plans</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
