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