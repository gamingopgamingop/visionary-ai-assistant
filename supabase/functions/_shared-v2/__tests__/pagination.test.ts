import { 
    parsePaginationParams, 
    createPaginatedResponse, 
    applyPagination, 
    encodeCursor, 
    decodeCursor, 
    createCursorFromItem, 
    buildPaginationLinks 
} from '../pagination.ts';

Deno.test("parsePaginationParams - defaults", () => {
    const params = new URLSearchParams();
    const result = parsePaginationParams(params);
    
    if (result.page !== 1) throw new Error("Default page should be 1");
    if (result.limit !== 20) throw new Error("Default limit should be 20");
    if (result.cursor !== undefined) throw new Error("Cursor should be undefined");
    if (result.offset !== undefined) throw new Error("Offset should be undefined");
});

Deno.test("parsePaginationParams - custom values", () => {
    const params = new URLSearchParams("page=3&limit=50&cursor=abc123&offset=100");
    const result = parsePaginationParams(params);
    
    if (result.page !== 3) throw new Error("Page should be 3");
    if (result.limit !== 50) throw new Error("Limit should be 50");
    if (result.cursor !== "abc123") throw new Error("Cursor mismatch");
    if (result.offset !== 100) throw new Error("Offset mismatch");
});

Deno.test("parsePaginationParams - limit bounds", () => {
    const params1 = new URLSearchParams("limit=0");
    const result1 = parsePaginationParams(params1, { maxLimit: 100 });
    if (result1.limit !== 1) throw new Error("Limit should be at least 1");
    
    const params2 = new URLSearchParams("limit=200");
    const result2 = parsePaginationParams(params2, { maxLimit: 100 });
    if (result2.limit !== 100) throw new Error("Limit should be capped at maxLimit");
});

Deno.test("parsePaginationParams - page bounds", () => {
    const params = new URLSearchParams("page=0");
    const result = parsePaginationParams(params);
    if (result.page !== 1) throw new Error("Page should be at least 1");
});

Deno.test("createPaginatedResponse - basic", () => {
    const data = [1, 2, 3, 4, 5];
    const params = { page: 1, limit: 10 };
    const response = createPaginatedResponse(data, params, 100);
    
    if (response.data.length !== 5) throw new Error("Data length mismatch");
    if (response.pagination.page !== 1) throw new Error("Page mismatch");
    if (response.pagination.limit !== 10) throw new Error("Limit mismatch");
    if (response.pagination.total !== 100) throw new Error("Total mismatch");
    if (!response.pagination.hasMore) throw new Error("Should have more");
    if (response.pagination.nextPage !== 2) throw new Error("Next page mismatch");
});

Deno.test("applyPagination - basic offset", () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    const params = { page: 2, limit: 10 };
    
    const result = applyPagination(items, params);
    
    if (result.items.length !== 10) throw new Error("Items length mismatch");
    if (result.items[0].id !== 11) throw new Error("First item should be 11");
    if (result.items[9].id !== 20) throw new Error("Last item should be 20");
    if (!result.pagination.hasMore) throw new Error("Should have more");
    if (result.pagination.nextPage !== 3) throw new Error("Next page mismatch");
});

Deno.test("applyPagination - cursor based", () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    const params = { cursor: "50", limit: 10 };
    
    const result = applyPagination(items, params);
    
    if (result.items.length !== 10) throw new Error("Items length mismatch");
    if (result.items[0].id !== 51) throw new Error("First item should be 51");
});

Deno.test("applyPagination - offset based", () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    const params = { offset: 50, limit: 10 };
    
    const result = applyPagination(items, params);
    
    if (result.items.length !== 10) throw new Error("Items length mismatch");
    if (result.items[0].id !== 51) throw new Error("First item should be 51");
});

Deno.test("encodeCursor / decodeCursor - round trip", () => {
    const data = { id: "123", timestamp: "2024-01-01T00:00:00Z" };
    const encoded = encodeCursor(data);
    const decoded = decodeCursor(encoded);
    
    if (!decoded) throw new Error("Decode failed");
    if (decoded.id !== "123") throw new Error("ID mismatch");
    if (decoded.timestamp !== "2024-01-01T00:00:00Z") throw new Error("Timestamp mismatch");
});

Deno.test("decodeCursor - invalid input", () => {
    const decoded = decodeCursor("invalid-base64!");
    if (decoded !== null) throw new Error("Should return null for invalid input");
});

Deno.test("createCursorFromItem - creates cursor", () => {
    const item = { id: "123", createdAt: "2024-01-01T00:00:00Z" };
    const cursor = createCursorFromItem(item);
    
    if (!cursor) throw new Error("Cursor should not be empty");
    const decoded = decodeCursor(cursor);
    if (!decoded) throw new Error("Cursor not decodable");
    if (decoded.id !== "123") throw new Error("ID mismatch");
});

Deno.test("buildPaginationLinks - first page", () => {
    const links = buildPaginationLinks("https://api.example.com/items", { page: 1, limit: 20 }, true);
    
    if (!links.first.includes("page=1")) throw new Error("First link wrong");
    if (links.prev) throw new Error("Should not have prev on first page");
    if (!links.next?.includes("page=2")) throw new Error("Next link wrong");
    if (links.last) throw new Error("Should not have last");
});

Deno.test("buildPaginationLinks - middle page", () => {
    const links = buildPaginationLinks("https://api.example.com/items", { page: 3, limit: 20 }, true);
    
    if (!links.first.includes("page=1")) throw new Error("First link wrong");
    if (!links.prev?.includes("page=2")) throw new Error("Prev link wrong");
    if (!links.next?.includes("page=4")) throw new Error("Next link wrong");
});

Deno.test("buildPaginationLinks - last page", () => {
    const links = buildPaginationLinks("https://api.example.com/items", { page: 5, limit: 20 }, false);
    
    if (!links.first.includes("page=1")) throw new Error("First link wrong");
    if (!links.prev?.includes("page=4")) throw new Error("Prev link wrong");
    if (links.next) throw new Error("Should not have next on last page");
});

Deno.test("buildPaginationLinks - cursor based", () => {
    const links = buildPaginationLinks("https://api.example.com/items", { page: 1, limit: 20, cursor: "abc123" }, true);
    
    if (links.next?.includes("cursor=abc123")) throw new Error("Next link should use cursor");
});