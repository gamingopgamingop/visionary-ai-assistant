import { 
    isRetryableError, 
    calculateBackoff, 
    createCircuitBreaker,
    ProviderCircuitBreakers,
    DEFAULT_RETRY_POLICY 
} from '../fallback.ts';

Deno.test("isRetryableError - timeout error", () => {
    const error = new Error("ETIMEDOUT");
    if (!isRetryableError(error)) throw new Error("Timeout should be retryable");
});

Deno.test("isRetryableError - network error", () => {
    const error = new Error("ECONNREFUSED");
    if (!isRetryableError(error)) throw new Error("Network error should be retryable");
});

Deno.test("isRetryableError - rate limit", () => {
    const error = new Error("rate limit exceeded");
    if (!isRetryableError(error)) throw new Error("Rate limit should be retryable");
});

Deno.test("isRetryableError - 5xx errors", () => {
    const error503 = new Error("503 Service Unavailable");
    if (!isRetryableError(error503)) throw new Error("503 should be retryable");
    
    const error502 = new Error("502 Bad Gateway");
    if (!isRetryableError(error502)) throw new Error("502 should be retryable");
});

Deno.test("isRetryableError - non-retryable 4xx", () => {
    const error400 = new Error("400 Bad Request");
    if (isRetryableError(error400)) throw new Error("400 should not be retryable");
    
    const error401 = new Error("401 Unauthorized");
    if (isRetryableError(error401)) throw new Error("401 should not be retryable");
    
    const error404 = new Error("404 Not Found");
    if (isRetryableError(error404)) throw new Error("404 should not be retryable");
});

Deno.test("calculateBackoff - exponential", () => {
    const policy = { ...DEFAULT_RETRY_POLICY, exponentialBackoff: true };
    
    const delay0 = calculateBackoff(0, policy);
    if (delay0 < policy.baseDelayMs || delay0 > policy.baseDelayMs + 1000) {
        throw new Error(`First delay should be ~${policy.baseDelayMs}ms, got ${delay0}`);
    }
    
    const delay1 = calculateBackoff(1, policy);
    if (delay1 < policy.baseDelayMs * 2 || delay1 > policy.baseDelayMs * 2 + 1000) {
        throw new Error(`Second delay should be ~${policy.baseDelayMs * 2}ms, got ${delay1}`);
    }
    
    const delay2 = calculateBackoff(2, policy);
    if (delay2 < policy.baseDelayMs * 4 || delay2 > policy.baseDelayMs * 4 + 1000) {
        throw new Error(`Third delay should be ~${policy.baseDelayMs * 4}ms, got ${delay2}`);
    }
});

Deno.test("calculateBackoff - capped at maxDelayMs", () => {
    const policy = { ...DEFAULT_RETRY_POLICY, exponentialBackoff: true, maxDelayMs: 5000 };
    
    const delay = calculateBackoff(10, policy);
    if (delay > policy.maxDelayMs + 1000) {
        throw new Error(`Delay should be capped at ${policy.maxDelayMs}, got ${delay}`);
    }
});

Deno.test("calculateBackoff - no exponential backoff", () => {
    const policy = { ...DEFAULT_RETRY_POLICY, exponentialBackoff: false };
    
    const delay0 = calculateBackoff(0, policy);
    const delay5 = calculateBackoff(5, policy);
    
    if (delay0 !== delay5) throw new Error("Should be constant without exponential backoff");
});

Deno.test("createCircuitBreaker - closed by default", () => {
    const breaker = createCircuitBreaker(3, 1000);
    
    if (breaker.isOpen()) throw new Error("Should be closed by default");
});

Deno.test("createCircuitBreaker - opens after threshold", () => {
    const breaker = createCircuitBreaker(3, 1000);
    
    breaker.recordFailure();
    if (breaker.isOpen()) throw new Error("Should not open after 1 failure");
    
    breaker.recordFailure();
    if (breaker.isOpen()) throw new Error("Should not open after 2 failures");
    
    breaker.recordFailure();
    if (!breaker.isOpen()) throw new Error("Should open after 3 failures");
});

Deno.test("createCircuitBreaker - success resets", () => {
    const breaker = createCircuitBreaker(3, 1000);
    
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    
    if (breaker.isOpen()) throw new Error("Success should reset failures");
});

Deno.test("createCircuitBreaker - auto reset after timeout", async () => {
    const breaker = createCircuitBreaker(2, 50); // 50ms timeout
    
    breaker.recordFailure();
    breaker.recordFailure();
    if (!breaker.isOpen()) throw new Error("Should be open");
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (breaker.isOpen()) throw new Error("Should auto-reset after timeout");
});

Deno.test("ProviderCircuitBreakers - per provider", () => {
    const breakers = new ProviderCircuitBreakers();
    
    breakers.recordFailure("openai");
    breakers.recordFailure("openai");
    breakers.recordFailure("openai");
    
    if (!breakers.isAvailable("openai")) throw new Error("OpenAI should be unavailable");
    if (!breakers.isAvailable("anthropic")) throw new Error("Anthropic should be available");
    
    breakers.recordSuccess("openai");
    if (!breakers.isAvailable("openai")) throw new Error("OpenAI should be available after success");
});