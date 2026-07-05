import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "npm:stripe@17";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
});

type CheckoutBody = {
  // Existing subscription/one-off with a preconfigured priceId
  priceId?: string;
  // Custom donation / pay-as-you-go
  amount?: number; // in whole currency units (e.g. dollars)
  currency?: string; // default "usd"
  productName?: string; // label shown on Stripe checkout
  recurring?: "month" | "year" | null; // null / undefined => one-time
  // Common
  userId: string;
  email?: string;
  mode?: "subscription" | "payment";
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as CheckoutBody;
    const { priceId, amount, currency = "usd", productName, recurring, userId, email, mode, successUrl, cancelUrl, metadata } = body;

    if (!userId) {
      return json({ error: "userId required" }, 400);
    }
    if (!priceId && !amount) {
      return json({ error: "priceId or amount required" }, 400);
    }

    const origin = req.headers.get("origin") ?? "";
    const isRecurring = recurring === "month" || recurring === "year";
    const resolvedMode: "subscription" | "payment" =
      mode ?? (priceId ? "subscription" : isRecurring ? "subscription" : "payment");

    // Build line items
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
    if (priceId) {
      line_items = [{ price: priceId, quantity: 1 }];
    } else {
      const unit_amount = Math.round((amount ?? 0) * 100);
      if (unit_amount < 50) return json({ error: "Minimum amount is $0.50" }, 400);
      line_items = [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount,
            product_data: { name: productName ?? "Donation" },
            ...(isRecurring ? { recurring: { interval: recurring! } } : {}),
          },
        },
      ];
    }

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: resolvedMode,
      line_items,
      customer_email: email,
      client_reference_id: userId,
      metadata: { user_id: userId, ...(metadata ?? {}) },
      success_url: successUrl ?? `${origin}/workspace?upgraded=1`,
      cancel_url: cancelUrl ?? `${origin}/pricing?canceled=1`,
      allow_promotion_codes: true,
    };
    if (resolvedMode === "subscription") {
      params.subscription_data = { metadata: { user_id: userId, ...(metadata ?? {}) } };
    }

    const session = await stripe.checkout.sessions.create(params);
    return json({ url: session.url });
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
