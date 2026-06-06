import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/providers/AuthProvider";

export type PlanName = "free" | "lite" | "starter" | "plus" | "pro" | "studio" | "enterprise";

const LIMITS: Record<PlanName, number> = {
  free: 10, lite: 20, starter: 30, plus: 60, pro: 100, studio: 500, enterprise: Infinity,
};

export function useQuota(action = "ai_generation") {
  const { userId, isSignedIn } = useCurrentUser();
  const [used, setUsed] = useState(0);
  const [plan, setPlan] = useState<PlanName>("free");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const [{ count }, planRow] = await Promise.all([
      supabase.from("usage_tracking").select("*", { count: "exact", head: true })
        .eq("user_id", userId).eq("action", action).gte("created_at", since.toISOString()),
      supabase.from("user_plans").select("plan").eq("user_id", userId).maybeSingle(),
    ]);
    setUsed(count ?? 0);
    setPlan(((planRow.data?.plan as PlanName) ?? "free"));
    setLoading(false);
  }, [userId, action]);

  useEffect(() => { refresh(); }, [refresh]);

  const limit = LIMITS[plan];
  const canUse = used < limit;

  const consume = async () => {
    if (!userId) return { ok: false, reason: "not_signed_in" as const };
    if (!canUse) return { ok: false, reason: "quota_exceeded" as const };
    await supabase.from("usage_tracking").insert({ user_id: userId, action });
    setUsed((n) => n + 1);
    return { ok: true as const };
  };

  return { used, limit, plan, canUse, loading, isSignedIn, consume, refresh };
}
