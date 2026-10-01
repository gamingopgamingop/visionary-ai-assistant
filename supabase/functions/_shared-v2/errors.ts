export class AppError extends Error {
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
        } = {}
    ) {
        super(message, { cause: options.cause });
        this.name = 'AppError';
        this.code = code;
        this.statusCode = options.statusCode ?? 500;
        this.retryable = options.retryable ?? false;
        this.details = options.details;
    }

    static isAppError(error: unknown): error is AppError {
        return error instanceof AppError;
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

export class AuthenticationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super('AUTHENTICATION_ERROR', message, {
            statusCode: 401,
            retryable: false,
            details,
        });
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super('AUTHORIZATION_ERROR', message, {
            statusCode: 403,
            retryable: false,
            details,
        });
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, identifier: string, details?: Record<string, unknown>) {
        super('NOT_FOUND', `${resource} not found: ${identifier}`, {
            statusCode: 404,
            retryable: false,
            details: { resource, identifier, ...details },
        });
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends AppError {
    public readonly fieldErrors?: Record<string, string[]>;

    constructor(message: string, fieldErrors?: Record<string, string[]>, details?: Record<string, unknown>) {
        super('VALIDATION_ERROR', message, {
            statusCode: 400,
            retryable: false,
            details: { fieldErrors, ...details },
        });
        this.name = 'ValidationError';
        this.fieldErrors = fieldErrors;
    }
}

export class RateLimitError extends AppError {
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
        } = {}
    ) {
        super('RATE_LIMIT_ERROR', message, {
            statusCode: 429,
            retryable: true,
            details: options.details,
        });
        this.name = 'RateLimitError';
        this.resetAt = options.resetAt;
        this.limit = options.limit;
        this.remaining = options.remaining;
    }
}

export class QuotaExceededError extends AppError {
    constructor(resourceType: string, details?: Record<string, unknown>) {
        super('QUOTA_EXCEEDED', `Quota exceeded for ${resourceType}`, {
            statusCode: 429,
            retryable: true,
            details: { resourceType, ...details },
        });
        this.name = 'QuotaExceededError';
    }
}

export class ConfigurationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super('CONFIGURATION_ERROR', message, {
            statusCode: 500,
            retryable: false,
            details,
        });
        this.name = 'ConfigurationError';
    }
}

export class NetworkError extends AppError {
    constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
        super('NETWORK_ERROR', message, {
            statusCode: 502,
            retryable: true,
            details,
            cause,
        });
        this.name = 'NetworkError';
    }
}

export class TimeoutError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super('TIMEOUT_ERROR', message, {
            statusCode: 504,
            retryable: true,
            details,
        });
        this.name = 'TimeoutError';
    }
}

export class ProviderError extends AppError {
    constructor(provider: string, message: string, details?: Record<string, unknown>) {
        super('PROVIDER_ERROR', `Provider ${provider} error: ${message}`, {
            statusCode: 502,
            retryable: true,
            details: { provider, ...details },
        });
        this.name = 'ProviderError';
    }
}

export function isRetryableError(error: unknown): boolean {
    if (AppError.isAppError(error)) {
        return error.retryable;
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return true;
    }
    if (error instanceof DOMException && error.name === 'TimeoutError') {
        return true;
    }
    return false;
}

export function getErrorStatusCode(error: unknown): number {
    if (AppError.isAppError(error)) {
        return error.statusCode;
    }
    return 500;
}

export function formatErrorResponse(error: unknown): Record<string, unknown> {
    if (AppError.isAppError(error)) {
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
        name: 'UnknownError',
        message: String(error),
    };
}