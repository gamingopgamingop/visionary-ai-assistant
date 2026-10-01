import { WebhookVerificationError } from "../../../../errors.ts";
import { logger } from "../../../../logger.ts";

export async function verifyStripeWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
  const crypto = await import("node:crypto");
  const elements = signature.split(",");
  const timestamp = elements[0].split("=")[1];
  const signatureHash = elements[1].split("=")[1];
  
  const expectedSignature = crypto.createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  
  return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedSignature));
}

export async function handleStripeWebhook(event: { type: string; data: { object: any } }): Promise<{ success: boolean; message?: string; data?: unknown }> {
  logger.info("Processing Stripe webhook", { eventType: event.type });
  
  switch (event.type) {
    case "customer.created":
      return { success: true, message: "Customer created", data: event.data.object };
    case "customer.updated":
      return { success: true, message: "Customer updated", data: event.data.object };
    case "customer.deleted":
      return { success: true, message: "Customer deleted", data: event.data.object };
    case "subscription.created":
      return { success: true, message: "Subscription created", data: event.data.object };
    case "subscription.updated":
      return { success: true, message: "Subscription updated", data: event.data.object };
    case "subscription.deleted":
      return { success: true, message: "Subscription cancelled", data: event.data.object };
    case "payment_intent.succeeded":
      return { success: true, message: "Payment succeeded", data: event.data.object };
    case "payment_intent.payment_failed":
      return { success: true, message: "Payment failed", data: event.data.object };
    default:
      return { success: true, message: `Stripe event ${event.type} received`, data: event.data.object };
  }
}