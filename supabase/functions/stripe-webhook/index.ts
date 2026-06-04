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
  [Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") ?? ""]: "pro",
  [Deno.env.get("STRIPE_PRICE_PRO_YEARLY") ?? ""]: "pro",
  [Deno.env.get("STRIPE_PRICE_ENTERPRISE_MONTHLY") ?? ""]: "enterprise",
  [Deno.env.get("STRIPE_PRICE_ENTERPRISE_YEARLY") ?? ""]: "enterprise",
};

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
      const subId = s.subscription as string | null;
      let plan = "pro";
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price.id;
        plan = PRICE_TO_PLAN[priceId ?? ""] ?? "pro";
        if (userId) {
          await supabase.from("user_plans").upsert({
            user_id: userId,
            plan,
            stripe_customer_id: s.customer as string,
            stripe_subscription_id: subId,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          });
        }
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await supabase.from("user_plans").update({ plan: "free", stripe_subscription_id: null }).eq("user_id", userId);
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
