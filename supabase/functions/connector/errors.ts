export class ConnectorError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options: {
      statusCode?: number;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ConnectorError";
    this.code = code;
    this.statusCode = options.statusCode ?? 500;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }

  static isConnectorError(error: unknown): error is ConnectorError {
    return error instanceof ConnectorError;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
      stack: this.stack,
    };
  }
}

export class AuthenticationError extends ConnectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("AUTHENTICATION_ERROR", message, {
      statusCode: 401,
      retryable: false,
      details,
    });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ConnectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("AUTHORIZATION_ERROR", message, {
      statusCode: 403,
      retryable: false,
      details,
    });
    this.name = "AuthorizationError";
  }
}

export class RateLimitError extends ConnectorError {
  public readonly resetAt?: number;
  public readonly limit?: number;
  public readonly remaining?: number;

  constructor(
    message: string,
    options: {
      resetAt?: number;
      limit?: number;
      remaining?: number;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super("RATE_LIMIT_ERROR", message, {
      statusCode: 429,
      retryable: true,
      details: options.details,
    });
    this.name = "RateLimitError";
    this.resetAt = options.resetAt;
    this.limit = options.limit;
    this.remaining = options.remaining;
  }
}

export class NotFoundError extends ConnectorError {
  constructor(resource: string, identifier: string, details?: Record<string, unknown>) {
    super("NOT_FOUND", `${resource} not found: ${identifier}`, {
      statusCode: 404,
      retryable: false,
      details: { resource, identifier, ...details },
    });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ConnectorError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, {
      statusCode: 400,
      retryable: false,
      details: { fieldErrors, ...details },
    });
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class ConfigurationError extends ConnectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFIGURATION_ERROR", message, {
      statusCode: 500,
      retryable: false,
      details,
    });
    this.name = "ConfigurationError";
  }
}

export class NetworkError extends ConnectorError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super("NETWORK_ERROR", message, {
      statusCode: 502,
      retryable: true,
      details,
      cause,
    });
    this.name = "NetworkError";
  }
}

export class TimeoutError extends ConnectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("TIMEOUT_ERROR", message, {
      statusCode: 504,
      retryable: true,
      details,
    });
    this.name = "TimeoutError";
  }
}

export class WebhookVerificationError extends ConnectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("WEBHOOK_VERIFICATION_ERROR", message, {
      statusCode: 400,
      retryable: false,
      details,
    });
    this.name = "WebhookVerificationError";
  }
}

export class TokenExpiredError extends ConnectorError {
  constructor(message: string = "Access token has expired", details?: Record<string, unknown>) {
    super("TOKEN_EXPIRED", message, {
      statusCode: 401,
      retryable: true,
      details,
    });
    this.name = "TokenExpiredError";
  }
}

export class TokenRefreshError extends ConnectorError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super("TOKEN_REFRESH_ERROR", message, {
      statusCode: 401,
      retryable: false,
      details,
      cause,
    });
    this.name = "TokenRefreshError";
  }
}

export class ConnectorNotFoundError extends ConnectorError {
  constructor(connectorType: string, details?: Record<string, unknown>) {
    super("CONNECTOR_NOT_FOUND", `Connector not found: ${connectorType}`, {
      statusCode: 404,
      retryable: false,
      details: { connectorType, ...details },
    });
    this.name = "ConnectorNotFoundError";
  }
}

export class ActionNotSupportedError extends ConnectorError {
  constructor(connectorType: string, action: string, details?: Record<string, unknown>) {
    super("ACTION_NOT_SUPPORTED", `Action '${action}' not supported by connector '${connectorType}'`, {
      statusCode: 400,
      retryable: false,
      details: { connectorType, action, ...details },
    });
    this.name = "ActionNotSupportedError";
  }
}

export class PermissionDeniedError extends ConnectorError {
  constructor(permission: string, details?: Record<string, unknown>) {
    super("PERMISSION_DENIED", `Permission denied: ${permission}`, {
      statusCode: 403,
      retryable: false,
      details: { permission, ...details },
    });
    this.name = "PermissionDeniedError";
  }
}

export function isRetryableError(error: unknown): boolean {
  if (ConnectorError.isConnectorError(error)) {
    return error.retryable;
  }
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return true;
  }
  return false;
}

export function getErrorStatusCode(error: unknown): number {
  if (ConnectorError.isConnectorError(error)) {
    return error.statusCode;
  }
  return 500;
}

export function formatErrorResponse(error: unknown): Record<string, unknown> {
  if (ConnectorError.isConnectorError(error)) {
    return error.toJSON();
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    name: "UnknownError",
    message: String(error),
  };
}