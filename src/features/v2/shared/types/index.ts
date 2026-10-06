export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
    statusCode?: number;
  };
  meta?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

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

export interface RequestState {
  loading: boolean;
  error?: ApiErrorResponse['error'];
  lastUpdated?: Date;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  'aria-label'?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type FeatureFlag = 
  | 'NEW_AUTH_ENABLED'
  | 'NEW_CONNECTOR_ENGINE_ENABLED'
  | 'NEW_API_KEYS_ENABLED'
  | 'NEW_AUDIT_ENABLED'
  | 'NEW_AI_GATEWAY_ENABLED'
  | 'NEW_QUOTA_ENABLED'
  | 'NEW_RBAC_ENABLED'
  | 'OBSERVABILITY_ENABLED'
  | 'JOBS_V2_ENABLED';

export interface FeatureFlags {
  [key: string]: boolean;
}

// ============================================================
// Connector Types (shared between connector services and hooks)
// ============================================================

export type ConnectorAuthTypeV2 = 'oauth2' | 'api_key' | 'bearer_token' | 'basic' | 'none';

export type ConnectorStatusV2 = 'pending' | 'active' | 'error' | 'revoked' | 'expired';

export interface ConnectorConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  version: string;
  authType: ConnectorAuthTypeV2;
  oauth2?: {
    authorizationUrl: string;
    tokenUrl: string;
    scopes: string[];
    pkce?: boolean;
  };
  apiKey?: {
    headerName: string;
    prefix?: string;
  };
  baseUrl: string;
  endpoints: Record<string, ConnectorEndpointConfig>;
  rateLimits?: {
    requests: number;
    windowMs: number;
  };
  requiredPermissions: string[];
  optionalPermissions: string[];
  enabled: boolean;
  status?: ConnectorStatusV2;
  metadata?: Record<string, unknown>;
}

export interface ConnectorEndpointConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  requiredPermissions?: string[];
}

export interface ConnectorConnection {
  id: string;
  userId: string;
  connectorId: string;
  name: string;
  status: ConnectorStatusV2;
  authType: ConnectorAuthTypeV2;
  config: Record<string, unknown>;
  credentials: ConnectorCredentials;
  permissions: string[];
  lastUsedAt?: string;
  lastError?: string;
  errorCount: number;
  expiresAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

export interface ConnectorActionResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  requestId?: string;
}