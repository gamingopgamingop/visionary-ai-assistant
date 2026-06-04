import { Progress } from "@/components/ui/progress";
import { useQuota } from "@/hooks/useQuota";
import { cn } from "@/lib/utils";

export default function QuotaBar({ className }: { className?: string }) {
  const { used, limit, plan, loading, isSignedIn } = useQuota();
  if (!isSignedIn || loading) return null;
  if (!isFinite(limit)) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        {plan.toUpperCase()} · unlimited
      </div>
    );
  }
  const pct = Math.min(100, (used / limit) * 100);
  const tone = pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-yellow-500" : "bg-primary";
  return (
    <div className={cn("flex flex-col gap-1 min-w-[180px]", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{plan.toUpperCase()} plan</span>
        <span className="font-medium">{used} / {limit} today</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
