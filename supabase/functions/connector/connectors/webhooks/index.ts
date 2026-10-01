import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const webhooksConfig: ConnectorConfig = {
  type: "webhook",
  name: "webhook",
  displayName: "Webhooks",
  description: "Generic webhook handler for receiving and processing webhook events",
  version: "1.0.0",
  auth: {
    type: "none",
  } as AuthConfig,
  baseUrl: "",
  endpoints: {
    receive: {
      method: "POST",
      path: "/receive",
      description: "Receive webhook event",
      authRequired: false,
    },
    verify: {
      method: "POST",
      path: "/verify",
      description: "Verify webhook signature",
      authRequired: false,
    },
  },
  rateLimits: {
    requests: 1000,
    windowMs: 60000,
  } as RateLimitConfig,
  permissions: {
    scopes: [],
    requiredPermissions: [],
    optionalPermissions: [],
  } as PermissionConfig,
  webhooks: {
    events: [],
    secretHeader: "",
  },
  metadata: {
    categories: ["webhooks", "integration"],
    tags: ["webhooks", "events", "notifications", "generic"],
  },
};

export default webhooksConfig;