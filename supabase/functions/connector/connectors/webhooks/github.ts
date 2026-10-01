import { WebhookVerificationError } from "../../../../errors.ts";
import { logger } from "../../../../logger.ts";

export async function verifyGitHubWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
  const crypto = await import("node:crypto");
  const expectedSignature = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export async function handleGitHubWebhook(event: { type: string; payload: any }): Promise<{ success: boolean; message?: string; data?: unknown }> {
  logger.info("Processing GitHub webhook", { eventType: event.type });
  
  switch (event.type) {
    case "push":
      return { success: true, message: "Push event processed", data: { ref: event.payload.ref } };
    case "pull_request":
      return { success: true, message: "Pull request event processed", data: { action: event.payload.action } };
    case "issues":
      return { success: true, message: "Issue event processed", data: { action: event.payload.action } };
    case "release":
      return { success: true, message: "Release event processed", data: { action: event.payload.action } };
    default:
      return { success: true, message: `GitHub event ${event.type} received`, data: event.payload };
  }
}