import { 
    createSuccessResponse, 
    createErrorResponse, 
    createPaginatedResponse, 
    jsonResponse, 
    successResponse, 
    errorResponse, 
    paginatedResponse, 
    corsHeaders, 
    handleCors, 
    addCorsHeaders 
} from '../response.ts';
import { ConnectorError } from '../errors.ts';

Deno.test("createSuccessResponse - basic", () => {
    const response = createSuccessResponse({ foo: "bar" });
    if (!response.success) throw new Error("Should be success");
    if (response.data.foo !== "bar") throw new Error("Data mismatch");
});

Deno.test("createSuccessResponse - with meta", () => {
    const response = createSuccessResponse({ foo: "bar" }, { requestId: "123" });
    if (!response.meta || response.meta.requestId !== "123") throw new Error("Meta missing");
});

Deno.test("createErrorResponse - ConnectorError", () => {
    const error = new ConnectorError("TEST_ERROR", "Test message", { statusCode: 400, retryable: true });
    const response = createErrorResponse(error);
    
    if (response.success) throw new Error("Should be failure");
    if (!response.error) throw new Error("Should have error");
    if (response.error.code !== "TEST_ERROR") throw new Error("Wrong code");
    if (response.error.message !== "Test message") throw new Error("Wrong message");
    if (response.error.statusCode !== 400) throw new Error("Wrong status code");
    if (!response.error.retryable) throw new Error("Should be retryable");
});

Deno.test("createErrorResponse - generic Error", () => {
    const error = new Error("Generic error");
    const response = createErrorResponse(error);
    
    if (response.success) throw new Error("Should be failure");
    if (response.error.code !== "INTERNAL_ERROR") throw new Error("Wrong code");
    if (response.error.message !== "Generic error") throw new Error("Wrong message");
});

Deno.test("createErrorResponse - unknown error", () => {
    const response = createErrorResponse("string error");
    
    if (response.success) throw new Error("Should be failure");
    if (response.error.code !== "UNKNOWN_ERROR") throw new Error("Wrong code");
    if (response.error.message !== "string error") throw new Error("Wrong message");
});

Deno.test("createPaginatedResponse - basic", () => {
    const data = [1, 2, 3];
    const response = createPaginatedResponse(data, 1, 10, 100);
    
    if (response.data.length !== 3) throw new Error("Data length mismatch");
    if (response.pagination.page !== 1) throw new Error("Wrong page");
    if (response.pagination.limit !== 10) throw new Error("Wrong limit");
    if (response.pagination.total !== 100) throw new Error("Wrong total");
    if (!response.pagination.hasMore) throw new Error("Should have more");
    if (response.pagination.nextPage !== 2) throw new Error("Wrong next page");
});

Deno.test("createPaginatedResponse - last page", () => {
    const data = [1, 2, 3];
    const response = createPaginatedResponse(data, 10, 10, 95);
    
    if (response.pagination.hasMore) throw new Error("Should not have more");
    if (response.pagination.nextPage !== undefined) throw new Error("Should not have next page");
});

Deno.test("jsonResponse - correct format", () => {
    const response = jsonResponse({ test: true }, 201);
    if (response.status !== 201) throw new Error("Wrong status");
    if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("Wrong content type");
});

Deno.test("successResponse - wraps correctly", () => {
    const response = successResponse({ test: true });
    if (response.status !== 200) throw new Error("Wrong status");
});

Deno.test("errorResponse - creates error response", () => {
    const response = errorResponse("TEST_ERROR", "Test message", 400);
    if (response.status !== 400) throw new Error("Wrong status");
});

Deno.test("paginatedResponse - wraps correctly", () => {
    const response = paginatedResponse([1, 2, 3], 1, 10, 100);
    if (response.status !== 200) throw new Error("Wrong status");
});

Deno.test("corsHeaders - default origin", () => {
    const headers = corsHeaders();
    if (headers["Access-Control-Allow-Origin"] !== "*") throw new Error("Wrong origin");
    if (!headers["Access-Control-Allow-Methods"]?.includes("POST")) throw new Error("Missing methods");
    if (!headers["Access-Control-Allow-Headers"]?.includes("Authorization")) throw new Error("Missing headers");
});

Deno.test("corsHeaders - custom origin", () => {
    const headers = corsHeaders("https://example.com");
    if (headers["Access-Control-Allow-Origin"] !== "https://example.com") throw new Error("Wrong origin");
});

Deno.test("handleCors - OPTIONS request", () => {
    const req = new Request("https://example.com", { method: "OPTIONS" });
    const response = handleCors(req);
    
    if (!response) throw new Error("Should return response");
    if (response.status !== 204) throw new Error("Wrong status");
});

Deno.test("handleCors - non-OPTIONS request", () => {
    const req = new Request("https://example.com", { method: "GET" });
    const response = handleCors(req);
    
    if (response !== null) throw new Error("Should return null");
});

Deno.test("addCorsHeaders - adds headers", () => {
    const response = new Response("test");
    const newResponse = addCorsHeaders(response, "https://example.com");
    
    if (!newResponse.headers.get("Access-Control-Allow-Origin")) throw new Error("Missing CORS header");
    if (newResponse.headers.get("Access-Control-Allow-Origin") !== "https://example.com") throw new Error("Wrong origin");
});