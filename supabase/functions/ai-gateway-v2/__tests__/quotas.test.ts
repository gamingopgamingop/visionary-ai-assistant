import { 
    checkQuota, 
    getQuota, 
    getAllQuotas, 
    resetQuota, 
    initializeUserQuotas,
    upgradeUserPlan,
    PLAN_LIMITS 
} from '../quotas.ts';

Deno.test("PLAN_LIMITS - structure", () => {
    const plans = ["free", "pro", "business", "enterprise"];
    const resources = ["ai_requests", "ai_tokens", "ai_images", "connector_calls", "api_calls", "storage", "background_jobs"];
    
    for (const plan of plans) {
        if (!PLAN_LIMITS[plan]) throw new Error(`Missing plan: ${plan}`);
        for (const resource of resources) {
            if (!PLAN_LIMITS[plan][resource]) throw new Error(`Missing resource ${resource} for plan ${plan}`);
            if (!PLAN_LIMITS[plan][resource].limit) throw new Error(`Missing limit for ${resource}`);
            if (!PLAN_LIMITS[plan][resource].period) throw new Error(`Missing period for ${resource}`);
        }
    }
});

Deno.test("PLAN_LIMITS - free tier limits", () => {
    if (PLAN_LIMITS.free.ai_requests.limit !== 100) throw new Error("Free ai_requests should be 100");
    if (PLAN_LIMITS.free.ai_tokens.limit !== 50000) throw new Error("Free ai_tokens should be 50000");
    if (PLAN_LIMITS.free.ai_images.limit !== 10) throw new Error("Free ai_images should be 10");
});

Deno.test("PLAN_LIMITS - enterprise tier limits", () => {
    if (PLAN_LIMITS.enterprise.ai_requests.limit !== 100000) throw new Error("Enterprise ai_requests should be 100000");
    if (PLAN_LIMITS.enterprise.ai_tokens.limit !== 100000000) throw new Error("Enterprise ai_tokens should be 100000000");
    if (PLAN_LIMITS.enterprise.ai_images.limit !== 10000) throw new Error("Enterprise ai_images should be 10000");
});

Deno.test("getPeriodStart - daily", () => {
    const { getPeriodStart } = await import('../quotas.ts');
    // This test would need the function exported
    // For now, just verify the module loads
});

Deno.test("getPeriodEnd - daily", () => {
    const { getPeriodEnd, getPeriodStart } = await import('../quotas.ts');
    // Test structure
});