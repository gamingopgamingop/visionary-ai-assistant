export type ConnectorType =
  | "github"
  | "google"
  | "microsoft"
  | "slack"
  | "discord"
  | "notion"
  | "trello"
  | "jira"
  | "linear"
  | "supabase"
  | "stripe"
  | "webhook"
  | "generic";

export type AuthType = "oauth2" | "api_key" | "bearer_token" | "basic" | "none";

export interface ConnectorConfig {
  type: ConnectorType;
  name: string;
  displayName: string;
  description: string;
  version: string;
  auth: AuthConfig;
  baseUrl: string;
  endpoints: ConnectorEndpoints;
  rateLimits?: RateLimitConfig;
  permissions?: PermissionConfig;
  webhooks?: WebhookConfig;
  metadata?: Record<string, unknown>;
}

export interface AuthConfig {
  type: AuthType;
  oauth2?: OAuth2Config;
  apiKey?: ApiKeyConfig;
  bearerToken?: BearerTokenConfig;
  basic?: BasicAuthConfig;
}

export interface OAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
  pkce?: boolean;
  state?: string;
}

export interface ApiKeyConfig {
  headerName: string;
  prefix?: string;
  queryParam?: string;
}

export interface BearerTokenConfig {
  tokenUrl?: string;
  refreshUrl?: string;
}

export interface BasicAuthConfig {
  username: string;
  password: string;
}

export interface ConnectorEndpoints {
  [key: string]: EndpointConfig;
}

export interface EndpointConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description?: string;
  parameters?: ParameterConfig[];
  requestBody?: RequestBodyConfig;
  responses?: ResponseConfig[];
  authRequired?: boolean;
  rateLimit?: RateLimitConfig;
}

export interface ParameterConfig {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface RequestBodyConfig {
  contentType: "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded" | "text/plain";
  schema?: Record<string, unknown>;
  required?: boolean;
  description?: string;
}

export interface ResponseConfig {
  statusCode: number;
  description: string;
  contentType?: string;
  schema?: Record<string, unknown>;
}

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  burst?: number;
}

export interface PermissionConfig {
  scopes: string[];
  requiredPermissions?: string[];
  optionalPermissions?: string[];
}

export interface WebhookConfig {
  events: string[];
  secretHeader?: string;
  verifySignature?: (payload: string, signature: string, secret: string) => boolean;
}

export interface ConnectorInstance {
  id: string;
  connectorType: ConnectorType;
  userId: string;
  name: string;
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  status: ConnectorStatus;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectorCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  custom?: Record<string, unknown>;
}

export type ConnectorStatus = "active" | "inactive" | "error" | "pending_auth" | "revoked";

export interface ConnectorRegistryEntry {
  type: ConnectorType;
  factory: ConnectorFactory;
  config: ConnectorConfig;
}

export type ConnectorFactory = (config: ConnectorConfig, credentials: ConnectorCredentials) => Connector;

export interface Connector {
  type: ConnectorType;
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  initialize(): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  execute(action: string, params: Record<string, unknown>): Promise<ConnectorResult>;
  getWebhookHandler?(): WebhookHandler;
  destroy(): Promise<void>;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface ConnectorResult {
  success: boolean;
  data?: unknown;
  error?: ConnectorError;
  metadata?: Record<string, unknown>;
}

export interface ConnectorError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
  statusCode?: number;
}

export interface WebhookHandler {
  verify(payload: string, signature: string): Promise<boolean>;
  handle(event: WebhookEvent): Promise<WebhookResult>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface WebhookResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface OAuthState {
  state: string;
  codeVerifier?: string;
  redirectUri: string;
  connectorType: ConnectorType;
  userId: string;
  scopes: string[];
  createdAt: number;
  expiresAt: number;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    hasMore: boolean;
    nextCursor?: string;
    nextPage?: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ConnectorError;
  meta?: Record<string, unknown>;
}