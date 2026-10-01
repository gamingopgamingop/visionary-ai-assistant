import { WebhookVerificationError } from "../../../../errors.ts";
import { logger } from "../../../../logger.ts";

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface WebhookHandler {
  verify(payload: string, signature: string, secret: string): Promise<boolean>;
  handle(event: WebhookEvent): Promise<{ success: boolean; message?: string; data?: unknown }>;
}

export function createWebhookHandler(connectorType: string): WebhookHandler {
  switch (connectorType) {
    case "github":
      return githubWebhookHandler;
    case "stripe":
      return stripeWebhookHandler;
    case "slack":
      return slackWebhookHandler;
    default:
      return genericWebhookHandler;
  }
}

const githubWebhookHandler: WebhookHandler = {
  async verify(payload: string, signature: string, secret: string): Promise<boolean> {
    const crypto = await import("node:crypto");
    const expectedSignature = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  },

  async handle(event: WebhookEvent): Promise<{ success: boolean; message?: string; data?: unknown }> {
    logger.info("Processing GitHub webhook", { eventType: event.type });
    return { success: true, message: `Processed ${event.type}`, data: event.payload };
  },
};

const stripeWebhookHandler: WebhookHandler = {
  async verify(payload: string, signature: string, secret: string): Promise<boolean> {
    const crypto = await import("node:crypto");
    const elements = signature.split(",");
    const timestamp = elements[0].split("=")[1];
    const signatureHash = elements[1].split("=")[1];
    
    const expectedSignature = crypto.createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    
    return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedSignature));
  },

  async handle(event: WebhookEvent): Promise<{ success: boolean; message?: string; data?: unknown }> {
    logger.info("Processing Stripe webhook", { eventType: event.type });
    return { success: true, message: `Processed ${event.type}`, data: event.payload };
  },
};

const slackWebhookHandler: WebhookHandler = {
  async verify(payload: string, signature: string, secret: string): Promise<boolean> {
    const crypto = await import("node:crypto");
    const [timestamp, hash] = signature.split(",").map(s => s.split("=")[1]);
    const expectedHash = crypto.createHmac("sha256", secret)
      .update(`v0:${timestamp}:${payload}`)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(`v0=${expectedHash}`), Buffer.from(signature));
  },

  async handle(event: WebhookEvent): Promise<{ success: boolean; message?: string; data?: unknown }> {
    logger.info("Processing Slack webhook", { eventType: event.type });
    
    // Handle URL verification challenge
    if (event.payload.type === "url_verification") {
      return { success: true, message: "URL verified", data: { challenge: event.payload.challenge } };
    }
    
    return { success: true, message: `Processed ${event.type}`, data: event.payload };
  },
};

const genericWebhookHandler: WebhookHandler = {
  async verify(payload: string, signature: string, secret: string): Promise<boolean> {
    const crypto = await import("node:crypto");
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  },

  async handle(event: WebhookEvent): Promise<{ success: boolean; message?: string; data?: unknown }> {
    logger.info("Processing generic webhook", { eventType: event.type });
    return { success: true, message: `Processed ${event.type}`, data: event.payload };
  },
};

export async function verifyAndHandleWebhook(
  connectorType: string,
  payload: string,
  signature: string,
  secret: string,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const handler = createWebhookHandler(connectorType);
  
  const isValid = await handler.verify(payload, signature, secret);
  if (!isValid) {
    throw new WebhookVerificationError("Invalid webhook signature", { connectorType });
  }
  
  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    type: connectorType,
    timestamp: new Date().toISOString(),
    payload: JSON.parse(payload),
    headers: {},
  };
  
  return handler.handle(event);
}