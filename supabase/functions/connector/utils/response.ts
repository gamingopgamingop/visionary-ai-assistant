import type { ApiResponse, ConnectorError, PaginatedResponse } from "../types.ts";
import { ConnectorError as ConnectorErrorClass } from "../errors.ts";

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

export function createErrorResponse(error: ConnectorError | Error | unknown, meta?: Record<string, unknown>): ApiResponse<null> {
  if (ConnectorErrorClass.isConnectorError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
        statusCode: error.statusCode,
      },
      meta,
    };
  }
  
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message,
        retryable: false,
        statusCode: 500,
      },
      meta,
    };
  }
  
  return {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: String(error),
      retryable: false,
      statusCode: 500,
    },
    meta,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total?: number,
  nextCursor?: string,
  nextPage?: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      hasMore: total !== undefined ? page * limit < total : data.length === limit,
      nextCursor,
      nextPage,
    },
  };
}

export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>): Response {
  return jsonResponse(createSuccessResponse(data, meta));
}

export function errorResponse(error: ConnectorError | Error | unknown, status: number = 500): Response {
  return jsonResponse(createErrorResponse(error), status);
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total?: number,
  nextCursor?: string,
  nextPage?: number,
): Response {
  return jsonResponse(createPaginatedResponse(data, page, limit, total, nextCursor, nextPage));
}

export function corsHeaders(origin?: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req.headers.get("Origin") || undefined),
    });
  }
  return null;
}

export function addCorsHeaders(response: Response, origin?: string): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}