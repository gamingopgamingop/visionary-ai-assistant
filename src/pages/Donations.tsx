import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, Coffee, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/providers/AuthProvider";
import { toast } from "sonner";

const PRESETS = [3, 5, 10, 25];
const RECURRING_TIERS = [
  { amount: 3, name: "Supporter", perks: ["Warm fuzzy feelings", "Supporter badge"] },
  { amount: 8, name: "Backer", perks: ["Everything in Supporter", "+10 daily generations", "Priority feature votes"] },
  { amount: 20, name: "Champion", perks: ["Everything in Backer", "+50 daily generations", "Early access to new tools"] },
];

export default function Donations() {
  const { userId, email, isSignedIn } = useCurrentUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState("5");

  const checkout = async (opts: {
    amount: number;
    productName: string;
    recurring?: "month" | "year" | null;
    key: string;
  }) => {
    if (!isSignedIn || !userId) {
      toast.error("Sign in first to donate");
      return;
    }
    if (opts.amount < 1) {
      toast.error("Minimum donation is $1");
      return;
    }
    setBusy(opts.key);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          amount: opts.amount,
          productName: opts.productName,
          recurring: opts.recurring ?? null,
          userId,
          email,
          metadata: { type: "donation", tier: opts.productName },
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="container py-16 max-w-5xl">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Support the toolkit</h1>
        <p className="mt-3 text-muted-foreground">
          AI Image Toolkit is built with care. If it saves you time, consider chipping in — every bit helps
          cover model costs and keeps the free tier alive.
        </p>
      </div>

      <Tabs defaultValue="tip" className="mt-12">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="tip">Tip jar</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="tip" className="mt-8">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {PRESETS.map((a) => (
              <Card key={a} className="hover:border-primary transition-colors">
                <CardHeader className="text-center">
                  <Coffee className="h-8 w-8 mx-auto text-primary" />
                  <CardTitle className="text-3xl mt-2">${a}</CardTitle>
                  <CardDescription>{a <= 3 ? "A coffee" : a <= 5 ? "A latte" : a <= 10 ? "Lunch" : "Really generous"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    disabled={busy === `tip-${a}`}
                    onClick={() => checkout({ amount: a, productName: `$${a} tip`, key: `tip-${a}` })}
                  >
                    {busy === `tip-${a}` ? "Loading…" : `Donate $${a}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Pay what you want</CardTitle>
              <CardDescription>Minimum $1. Every cent goes toward keeping the toolkit running.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="pl-8 text-lg h-12"
                />
              </div>
              <Button
                className="w-full"
                disabled={busy === "custom"}
                onClick={() =>
                  checkout({
                    amount: parseFloat(custom) || 0,
                    productName: `$${custom} donation`,
                    key: "custom",
                  })
                }
              >
                {busy === "custom" ? "Loading…" : `Donate $${custom}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-8">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Recurring support unlocks small perks on top of your current plan.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {RECURRING_TIERS.map((t) => (
              <Card key={t.name} className={t.amount === 8 ? "ring-2 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>{t.name}</CardTitle>
                  </div>
                  <div className="pt-2">
                    <span className="text-3xl font-bold">${t.amount}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {t.perks.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Badge variant="secondary" className="h-5 shrink-0">✓</Badge>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    disabled={busy === `mo-${t.amount}`}
                    onClick={() =>
                      checkout({
                        amount: t.amount,
                        productName: `${t.name} — monthly`,
                        recurring: "month",
                        key: `mo-${t.amount}`,
                      })
                    }
                  >
                    {busy === `mo-${t.amount}` ? "Loading…" : `Become a ${t.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground mt-10">
        Payments processed securely by Stripe. Donations are not tax-deductible.
      </p>
    </main>
  );
}
