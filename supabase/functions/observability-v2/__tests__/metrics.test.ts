import { 
    recordMetric, 
    incrementCounter, 
    recordGauge, 
    recordHistogram, 
    recordTiming, 
    timeAsync, 
    timeSync,
    getMetricsBuffer,
    clearMetricsBuffer,
    getMetricsByName,
    getMetricsByTag
} from '../metrics.ts';

Deno.test("recordMetric - records metric", () => {
    clearMetricsBuffer();
    
    recordMetric("test_metric", 42, "count", { env: "test" });
    
    const metrics = getMetricsBuffer();
    if (metrics.length !== 1) throw new Error("Should have 1 metric");
    if (metrics[0].name !== "test_metric") throw new Error("Name mismatch");
    if (metrics[0].value !== 42) throw new Error("Value mismatch");
    if (metrics[0].unit !== "count") throw new Error("Unit mismatch");
    if (metrics[0].tags.env !== "test") throw new Error("Tag mismatch");
});

Deno.test("incrementCounter - increments", () => {
    clearMetricsBuffer();
    
    incrementCounter("requests", { endpoint: "/api/test" });
    incrementCounter("requests", { endpoint: "/api/test" });
    
    const metrics = getMetricsByName("requests");
    if (metrics.length !== 2) throw new Error("Should have 2 metrics");
    if (metrics[0].value !== 1) throw new Error("First should be 1");
    if (metrics[1].value !== 1) throw new Error("Second should be 1");
});

Deno.test("recordGauge - records gauge", () => {
    clearMetricsBuffer();
    
    recordGauge("active_connections", 10, { service: "api" });
    
    const metrics = getMetricsByName("active_connections");
    if (metrics.length !== 1) throw new Error("Should have 1 metric");
    if (metrics[0].unit !== "gauge") throw new Error("Unit should be gauge");
    if (metrics[0].value !== 10) throw new Error("Value mismatch");
});

Deno.test("recordHistogram - records histogram", () => {
    clearMetricsBuffer();
    
    recordHistogram("request_duration", 150, { endpoint: "/api/test" });
    
    const metrics = getMetricsByName("request_duration");
    if (metrics.length !== 1) throw new Error("Should have 1 metric");
    if (metrics[0].unit !== "ms") throw new Error("Unit should be ms");
});

Deno.test("recordTiming - records timing", () => {
    clearMetricsBuffer();
    
    recordTiming("db_query", 50, { table: "users" });
    
    const metrics = getMetricsByName("db_query");
    if (metrics.length !== 1) throw new Error("Should have 1 metric");
    if (metrics[0].unit !== "ms") throw new Error("Unit should be ms");
});

Deno.test("timeAsync - times async function", async () => {
    clearMetricsBuffer();
    
    await timeAsync("async_operation", async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return "result";
    });
    
    const metrics = getMetricsByName("async_operation");
    if (metrics.length !== 1) throw new Error("Should have 1 metric");
    if (metrics[0].value < 10) throw new Error("Duration should be at least 10ms");
    if (metrics[0].tags.status !== "success") throw new Error("Status should be success");
});

Deno.test("timeAsync - records error status", async () => {
    clearMetricsBuffer();
    
    try {
        await timeAsync("failing_operation", async () => {
            throw new Error("Test error");
        });
    } catch (e) {
        // Expected
    }
    
    const metrics = getMetricsByName("failing_operation");
    if (metrics.length !== 1) throw new Error("Should have 1 metric");
    if (metrics[0].tags.status !== "error") throw new Error("Status should be error");
});

Deno.test("timeSync - times sync function", () => {
    clearMetricsBuffer();
    
    const result = timeSync("sync_operation", () => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += i;
        return sum;
    });
    
    if (result !== 49995000) throw new Error("Wrong result");
    
    const metrics = getMetricsByName("sync_operation");
    if (metrics.length !== 1) throw new Error("Should have 1 metric");
    if (metrics[0].tags.status !== "success") throw new Error("Status should be success");
});

Deno.test("getMetricsByTag - filters by tag", () => {
    clearMetricsBuffer();
    
    recordMetric("metric_a", 1, "count", { env: "test", service: "api" });
    recordMetric("metric_b", 2, "count", { env: "prod", service: "api" });
    recordMetric("metric_c", 3, "count", { env: "test", service: "worker" });
    
    const testEnv = getMetricsByTag("env", "test");
    if (testEnv.length !== 2) throw new Error("Should have 2 test metrics");
    
    const prodEnv = getMetricsByTag("env", "prod");
    if (prodEnv.length !== 1) throw new Error("Should have 1 prod metric");
    
    const apiService = getMetricsByTag("service", "api");
    if (apiService.length !== 2) throw new Error("Should have 2 api metrics");
});

Deno.test("clearMetricsBuffer - clears buffer", () => {
    clearMetricsBuffer();
    recordMetric("test", 1, "count");
    clearMetricsBuffer();
    
    const metrics = getMetricsBuffer();
    if (metrics.length !== 0) throw new Error("Buffer should be empty");
});