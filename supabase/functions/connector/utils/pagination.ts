import type { PaginationParams, PaginatedResponse } from "../types.ts";

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
  defaultPage?: number;
}

export function parsePaginationParams(searchParams: URLSearchParams, options: PaginationOptions = {}): PaginationParams {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    defaultPage = 1,
  } = options;

  const page = Math.max(1, parseInt(searchParams.get("page") || String(defaultPage), 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit), 10)));
  const cursor = searchParams.get("cursor") || undefined;
  const offset = searchParams.has("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

  return { page, limit, cursor, offset };
}

export function createPaginatedResponse<T>(
  data: T[],
  params: PaginationParams,
  total?: number,
): PaginatedResponse<T> {
  const { page = 1, limit = 20, cursor, offset } = params;
  const hasMore = total !== undefined 
    ? (offset !== undefined ? offset + data.length < total : page * limit < total)
    : data.length === limit;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      hasMore,
      nextCursor: hasMore && cursor ? cursor : undefined,
      nextPage: hasMore && !cursor ? page + 1 : undefined,
    },
  };
}

export function applyPagination<T>(
  items: T[],
  params: PaginationParams,
): { items: T[]; pagination: PaginatedResponse<T>["pagination"] } {
  const { page = 1, limit = 20, cursor, offset } = params;
  
  let startIndex = 0;
  if (offset !== undefined) {
    startIndex = offset;
  } else if (cursor) {
    const cursorIndex = items.findIndex((item: any) => item.id === cursor || item.cursor === cursor);
    startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  } else {
    startIndex = (page - 1) * limit;
  }

  const endIndex = startIndex + limit;
  const paginatedItems = items.slice(startIndex, endIndex);
  const hasMore = endIndex < items.length;

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      hasMore,
      nextCursor: hasMore && paginatedItems.length > 0 ? (paginatedItems[paginatedItems.length - 1] as any).id : undefined,
      nextPage: hasMore ? page + 1 : undefined,
    },
  };
}

export function encodeCursor(data: Record<string, unknown>): string {
  return btoa(JSON.stringify(data));
}

export function decodeCursor<T>(cursor: string): T | null {
  try {
    return JSON.parse(atob(cursor)) as T;
  } catch {
    return null;
  }
}

export function createCursorFromItem<T extends { id?: string; createdAt?: string }>(item: T): string {
  return encodeCursor({
    id: item.id,
    createdAt: item.createdAt,
  });
}

export function buildPaginationLinks(
  baseUrl: string,
  params: PaginationParams,
  hasMore: boolean,
): { first: string; prev?: string; next?: string; last?: string } {
  const url = new URL(baseUrl);
  const { page = 1, limit = 20, cursor } = params;

  url.searchParams.set("limit", String(limit));

  const firstUrl = new URL(baseUrl);
  firstUrl.searchParams.set("limit", String(limit));
  firstUrl.searchParams.set("page", "1");

  const links: { first: string; prev?: string; next?: string; last?: string } = {
    first: firstUrl.toString(),
  };

  if (page > 1) {
    const prevUrl = new URL(baseUrl);
    prevUrl.searchParams.set("limit", String(limit));
    prevUrl.searchParams.set("page", String(page - 1));
    links.prev = prevUrl.toString();
  }

  if (hasMore) {
    const nextUrl = new URL(baseUrl);
    nextUrl.searchParams.set("limit", String(limit));
    if (cursor) {
      nextUrl.searchParams.set("cursor", cursor);
    } else {
      nextUrl.searchParams.set("page", String(page + 1));
    }
    links.next = nextUrl.toString();
  }

  return links;
}