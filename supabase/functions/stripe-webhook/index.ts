import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get("STRIPE_PRICE_LITE_MONTHLY") ?? "_"]: "lite",
  [Deno.env.get("STRIPE_PRICE_LITE_YEARLY") ?? "_"]: "lite",
  [Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY") ?? "_"]: "starter",
  [Deno.env.get("STRIPE_PRICE_STARTER_YEARLY") ?? "_"]: "starter",
  [Deno.env.get("STRIPE_PRICE_PLUS_MONTHLY") ?? "_"]: "plus",
  [Deno.env.get("STRIPE_PRICE_PLUS_YEARLY") ?? "_"]: "plus",
  [Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") ?? "_"]: "pro",
  [Deno.env.get("STRIPE_PRICE_PRO_YEARLY") ?? "_"]: "pro",
  [Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY") ?? "_"]: "studio",
  [Deno.env.get("STRIPE_PRICE_STUDIO_YEARLY") ?? "_"]: "studio",
  [Deno.env.get("STRIPE_PRICE_ENTERPRISE_MONTHLY") ?? "_"]: "enterprise",
  [Deno.env.get("STRIPE_PRICE_ENTERPRISE_YEARLY") ?? "_"]: "enterprise",
};

async function handleSubscription(userId: string, subId: string, customerId: string | null) {
  const sub = await stripe.subscriptions.retrieve(subId);
  const priceId = sub.items.data[0]?.price.id ?? "";
  const plan = PRICE_TO_PLAN[priceId] ?? "pro";
  await supabase.from("user_plans").upsert({
    user_id: userId,
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

async function handleOneOff(userId: string, s: Stripe.Checkout.Session) {
  const type = s.metadata?.type;
  if (type === "lifetime") {
    await supabase.from("user_plans").upsert({
      user_id: userId,
      plan: "lifetime",
      stripe_customer_id: s.customer as string | null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }
  // For payg_credits / donations: log to usage_tracking for audit
  await supabase.from("usage_tracking").insert({
    user_id: userId,
    action: `stripe:${type ?? "one_off"}:${s.amount_total ?? 0}`,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    if (sig && secret) {
      event = await stripe.webhooks.constructEventAsync(body, sig, secret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (e) {
    return new Response(`Webhook Error: ${(e as Error).message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.user_id || s.client_reference_id;
      if (!userId) {
        return json({ received: true, skipped: "no user_id" });
      }
      if (s.mode === "subscription" && s.subscription) {
        await handleSubscription(userId, s.subscription as string, s.customer as string | null);
      } else if (s.mode === "payment") {
        await handleOneOff(userId, s);
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) await handleSubscription(userId, sub.id, sub.customer as string | null);
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await supabase.from("user_plans").update({
          plan: "free",
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    }
    return json({ received: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
