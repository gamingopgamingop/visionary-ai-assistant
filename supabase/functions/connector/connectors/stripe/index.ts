import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const stripeConfig: ConnectorConfig = {
  type: "stripe",
  name: "stripe",
  displayName: "Stripe",
  description: "Connect to Stripe to manage customers, products, subscriptions, and payments",
  version: "1.0.0",
  auth: {
    type: "api_key",
    apiKey: {
      headerName: "Authorization",
      prefix: "Bearer",
    },
  } as AuthConfig,
  baseUrl: "https://api.stripe.com/v1",
  endpoints: {
    // Customers
    createCustomer: {
      method: "POST",
      path: "/customers",
      description: "Create a customer",
      authRequired: true,
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    getCustomer: {
      method: "GET",
      path: "/customers/{customer_id}",
      description: "Get a customer",
      authRequired: true,
      parameters: [
        { name: "customer_id", in: "path", required: true, type: "string" },
      ],
    },
    updateCustomer: {
      method: "POST",
      path: "/customers/{customer_id}",
      description: "Update a customer",
      authRequired: true,
      parameters: [
        { name: "customer_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    listCustomers: {
      method: "GET",
      path: "/customers",
      description: "List customers",
      authRequired: true,
      parameters: [
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "starting_after", in: "query", required: false, type: "string" },
        { name: "ending_before", in: "query", required: false, type: "string" },
      ],
    },
    deleteCustomer: {
      method: "DELETE",
      path: "/customers/{customer_id}",
      description: "Delete a customer",
      authRequired: true,
      parameters: [
        { name: "customer_id", in: "path", required: true, type: "string" },
      ],
    },
    // Products
    createProduct: {
      method: "POST",
      path: "/products",
      description: "Create a product",
      authRequired: true,
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    getProduct: {
      method: "GET",
      path: "/products/{product_id}",
      description: "Get a product",
      authRequired: true,
      parameters: [
        { name: "product_id", in: "path", required: true, type: "string" },
      ],
    },
    updateProduct: {
      method: "POST",
      path: "/products/{product_id}",
      description: "Update a product",
      authRequired: true,
      parameters: [
        { name: "product_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    listProducts: {
      method: "GET",
      path: "/products",
      description: "List products",
      authRequired: true,
      parameters: [
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "starting_after", in: "query", required: false, type: "string" },
        { name: "active", in: "query", required: false, type: "boolean" },
      ],
    },
    // Subscriptions
    createSubscription: {
      method: "POST",
      path: "/subscriptions",
      description: "Create a subscription",
      authRequired: true,
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    getSubscription: {
      method: "GET",
      path: "/subscriptions/{subscription_id}",
      description: "Get a subscription",
      authRequired: true,
      parameters: [
        { name: "subscription_id", in: "path", required: true, type: "string" },
      ],
    },
    updateSubscription: {
      method: "POST",
      path: "/subscriptions/{subscription_id}",
      description: "Update a subscription",
      authRequired: true,
      parameters: [
        { name: "subscription_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    listSubscriptions: {
      method: "GET",
      path: "/subscriptions",
      description: "List subscriptions",
      authRequired: true,
      parameters: [
        { name: "customer", in: "query", required: false, type: "string" },
        { name: "status", in: "query", required: false, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
      ],
    },
    cancelSubscription: {
      method: "DELETE",
      path: "/subscriptions/{subscription_id}",
      description: "Cancel a subscription",
      authRequired: true,
      parameters: [
        { name: "subscription_id", in: "path", required: true, type: "string" },
      ],
    },
    // Payments
    createPaymentIntent: {
      method: "POST",
      path: "/payment_intents",
      description: "Create a payment intent",
      authRequired: true,
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    getPaymentIntent: {
      method: "GET",
      path: "/payment_intents/{payment_intent_id}",
      description: "Get a payment intent",
      authRequired: true,
      parameters: [
        { name: "payment_intent_id", in: "path", required: true, type: "string" },
      ],
    },
    confirmPaymentIntent: {
      method: "POST",
      path: "/payment_intents/{payment_intent_id}/confirm",
      description: "Confirm a payment intent",
      authRequired: true,
      parameters: [
        { name: "payment_intent_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/x-www-form-urlencoded",
        required: true,
      },
    },
    listPaymentIntents: {
      method: "GET",
      path: "/payment_intents",
      description: "List payment intents",
      authRequired: true,
      parameters: [
        { name: "customer", in: "query", required: false, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
      ],
    },
  },
  rateLimits: {
    requests: 100,
    windowMs: 1000,
  } as RateLimitConfig,
  permissions: {
    scopes: [],
    requiredPermissions: [],
    optionalPermissions: [],
  } as PermissionConfig,
  webhooks: {
    events: [
      "customer.created",
      "customer.updated",
      "customer.deleted",
      "product.created",
      "product.updated",
      "product.deleted",
      "subscription.created",
      "subscription.updated",
      "subscription.deleted",
      "payment_intent.created",
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
    ],
    secretHeader: "Stripe-Signature",
  },
  metadata: {
    categories: ["payments", "billing", "subscriptions"],
    tags: ["stripe", "payments", "customers", "products", "subscriptions", "billing"],
  },
};

export default stripeConfig;