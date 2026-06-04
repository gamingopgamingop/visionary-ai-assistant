import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/providers/AuthProvider";
import { toast } from "sonner";

interface Tier {
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
  priceEnv: { monthly: string; yearly: string } | null;
}

const TIERS: Tier[] = [
  {
    name: "Free", tagline: "Try it out", monthly: 0, yearly: 0,
    features: ["10 AI generations / day", "Basic models", "Client-side tools unlimited"],
    priceEnv: null,
  },
  {
    name: "Pro", tagline: "For creators", monthly: 9, yearly: 86,
    features: ["100 AI generations / day", "All models incl. ONNX", "Full history", "Priority queue"],
    highlight: true,
    priceEnv: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY ?? "price_pro_monthly",
      yearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY ?? "price_pro_yearly",
    },
  },
  {
    name: "Enterprise", tagline: "Unlimited", monthly: 29, yearly: 278,
    features: ["Unlimited generations", "Priority processing", "API access", "Custom models"],
    priceEnv: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY ?? "price_enterprise_monthly",
      yearly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_YEARLY ?? "price_enterprise_yearly",
    },
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const { userId, email, isSignedIn } = useCurrentUser();
  const [busy, setBusy] = useState<string | null>(null);

  const checkout = async (tier: Tier) => {
    if (!tier.priceEnv) return;
    if (!isSignedIn || !userId) { toast.error("Sign in first"); return; }
    setBusy(tier.name);
    try {
      const priceId = yearly ? tier.priceEnv.yearly : tier.priceEnv.monthly;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, userId, email },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  return (
    <main className="container py-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when you need more AI horsepower.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={!yearly ? "font-medium" : "text-muted-foreground"}>Monthly</span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span className={yearly ? "font-medium" : "text-muted-foreground"}>Yearly <Badge variant="secondary" className="ml-1">-20%</Badge></span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
        {TIERS.map((t) => {
          const price = yearly ? t.yearly : t.monthly;
          return (
            <Card key={t.name} className={t.highlight ? "ring-2 ring-primary relative" : ""}>
              {t.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>}
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <CardDescription>{t.tagline}</CardDescription>
                <div className="pt-3">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-muted-foreground">/{yearly ? "yr" : "mo"}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {t.priceEnv ? (
                  <Button className="w-full" onClick={() => checkout(t)} disabled={busy === t.name}>
                    {busy === t.name ? "Loading…" : `Upgrade to ${t.name}`}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>Current</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
