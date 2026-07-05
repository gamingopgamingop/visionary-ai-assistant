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
    name: "Lite", tagline: "Casual use", monthly: 2, yearly: 19,
    features: ["20 AI generations / day", "Basic models", "History (7 days)"],
    priceEnv: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_LITE_MONTHLY ?? "price_lite_monthly",
      yearly: import.meta.env.VITE_STRIPE_PRICE_LITE_YEARLY ?? "price_lite_yearly",
    },
  },
  {
    name: "Starter", tagline: "For hobbyists", monthly: 4, yearly: 38,
    features: ["30 AI generations / day", "All basic models", "History (30 days)", "Email support"],
    priceEnv: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY ?? "price_starter_monthly",
      yearly: import.meta.env.VITE_STRIPE_PRICE_STARTER_YEARLY ?? "price_starter_yearly",
    },
  },
  {
    name: "Plus", tagline: "Power user", monthly: 6, yearly: 58,
    features: ["60 AI generations / day", "All models", "Preset pipelines", "Session history sync"],
    priceEnv: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_PLUS_MONTHLY ?? "price_plus_monthly",
      yearly: import.meta.env.VITE_STRIPE_PRICE_PLUS_YEARLY ?? "price_plus_yearly",
    },
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
    name: "Studio", tagline: "For teams", monthly: 19, yearly: 182,
    features: ["500 AI generations / day", "Team workspace (5 seats)", "Shared collections", "Batch processing", "Priority support"],
    priceEnv: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_STUDIO_MONTHLY ?? "price_studio_monthly",
      yearly: import.meta.env.VITE_STRIPE_PRICE_STUDIO_YEARLY ?? "price_studio_yearly",
    },
  },
  {
    name: "Enterprise", tagline: "Unlimited", monthly: 29, yearly: 278,
    features: ["Unlimited generations", "Priority processing", "API access", "Custom models", "SSO + SLA"],
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

  const oneOff = async (opts: { amount: number; productName: string; key: string; metadata?: Record<string, string> }) => {
    if (!isSignedIn || !userId) { toast.error("Sign in first"); return; }
    setBusy(opts.key);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          amount: opts.amount,
          productName: opts.productName,
          userId,
          email,
          metadata: opts.metadata,
        },
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

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mt-12 max-w-[1400px] mx-auto">
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

      {/* Lifetime + Team */}
      <div className="mt-20 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">One-time & team plans</h2>
          <p className="text-muted-foreground mt-2">No monthly commitment — pay once or scale a team.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="ring-2 ring-primary/50 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Best value</Badge>
            <CardHeader>
              <CardTitle>Lifetime</CardTitle>
              <CardDescription>One payment. Forever access.</CardDescription>
              <div className="pt-3">
                <span className="text-4xl font-bold">$199</span>
                <span className="text-muted-foreground"> once</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {["Everything in Pro, forever", "100 AI generations / day", "All future updates included", "No recurring charges"].map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Button className="w-full" disabled={busy === "lifetime"} onClick={() => oneOff({ amount: 199, productName: "Lifetime Pro access", key: "lifetime", metadata: { type: "lifetime" } })}>
                {busy === "lifetime" ? "Loading…" : "Get lifetime access"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Team / Agency</CardTitle>
              <CardDescription>Between Studio and Enterprise.</CardDescription>
              <div className="pt-3">
                <span className="text-4xl font-bold">$79</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {["1,500 AI generations / day", "Up to 15 seats", "Shared team workspace", "Central billing & usage", "Priority support"].map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Button className="w-full" disabled={busy === "team"} onClick={() => oneOff({ amount: 79, productName: "Team plan (monthly)", key: "team", metadata: { type: "team" } })}>
                {busy === "team" ? "Loading…" : "Start Team plan"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pay-as-you-go credit packs */}
      <div className="mt-20 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Pay-as-you-go credit packs</h2>
          <p className="text-muted-foreground mt-2">No subscription. Buy generations when you need them. Credits never expire.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { credits: 100, price: 5, key: "payg-100" },
            { credits: 500, price: 20, key: "payg-500", badge: "Popular" },
            { credits: 1000, price: 35, key: "payg-1000", badge: "Best rate" },
          ].map((pack) => (
            <Card key={pack.key} className={pack.badge ? "ring-2 ring-primary/50 relative" : ""}>
              {pack.badge && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{pack.badge}</Badge>}
              <CardHeader>
                <CardTitle>{pack.credits} credits</CardTitle>
                <CardDescription>${(pack.price / pack.credits).toFixed(3)} per generation</CardDescription>
                <div className="pt-3">
                  <span className="text-4xl font-bold">${pack.price}</span>
                  <span className="text-muted-foreground"> once</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled={busy === pack.key} onClick={() => oneOff({ amount: pack.price, productName: `${pack.credits} AI credits`, key: pack.key, metadata: { type: "payg_credits", credits: String(pack.credits) } })}>
                  {busy === pack.key ? "Loading…" : `Buy ${pack.credits} credits`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

