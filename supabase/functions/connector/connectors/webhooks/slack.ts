import { WebhookVerificationError } from "../../../../errors.ts";
import { logger } from "../../../../logger.ts";

export async function verifySlackWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
  const crypto = await import("node:crypto");
  const [timestamp, hash] = signature.split(",").map(s => s.split("=")[1]);
  const expectedHash = crypto.createHmac("sha256", secret)
    .update(`v0:${timestamp}:${payload}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(`v0=${expectedHash}`), Buffer.from(signature));
}

export async function handleSlackWebhook(event: { type: string; payload: any }): Promise<{ success: boolean; message?: string; data?: unknown }> {
  logger.info("Processing Slack webhook", { eventType: event.type });
  
  // Handle URL verification
  if (event.payload.type === "url_verification") {
    return { success: true, message: "URL verified", data: { challenge: event.payload.challenge } };
  }
  
  switch (event.type) {
    case "event_callback":
      const innerEvent = event.payload.event;
      switch (innerEvent?.type) {
        case "message":
          return { success: true, message: "Message event processed", data: innerEvent };
        case "reaction_added":
          return { success: true, message: "Reaction added", data: innerEvent };
        case "reaction_removed":
          return { success: true, message: "Reaction removed", data: innerEvent };
        case "channel_created":
          return { success: true, message: "Channel created", data: innerEvent };
        case "member_joined_channel":
          return { success: true, message: "Member joined channel", data: innerEvent };
        default:
          return { success: true, message: `Slack event ${innerEvent?.type} received`, data: innerEvent };
      }
    default:
      return { success: true, message: `Slack event ${event.type} received`, data: event.payload };
  }
}