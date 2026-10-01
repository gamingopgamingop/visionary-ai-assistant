import type { RateLimitConfig, RateLimitInfo } from './types.ts';
import { RateLimitError } from './errors.ts';

export interface RateLimiterConfig {
    defaultLimits?: RateLimitConfig;
    enableGlobalLimit?: boolean;
    globalLimit?: RateLimitConfig;
    storage?: RateLimitStorage;
}

export interface RateLimitStorage {
    increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
    get(key: string): Promise<{ count: number; resetAt: number } | null>;
    reset(key: string): Promise<void>;
}

class MemoryRateLimitStorage implements RateLimitStorage {
    private store: Map<string, { count: number; resetAt: number }> = new Map();
    private cleanupInterval: number;

    constructor() {
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
        const now = Date.now();
        const existing = this.store.get(key);

        if (existing && existing.resetAt > now) {
            existing.count++;
            return { count: existing.count, resetAt: existing.resetAt };
        }

        const resetAt = now + windowMs;
        this.store.set(key, { count: 1, resetAt });
        return { count: 1, resetAt };
    }

    async get(key: string): Promise<{ count: number; resetAt: number } | null> {
        const now = Date.now();
        const existing = this.store.get(key);

        if (existing && existing.resetAt > now) {
            return existing;
        }

        if (existing) {
            this.store.delete(key);
        }

        return null;
    }

    async reset(key: string): Promise<void> {
        this.store.delete(key);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, value] of this.store.entries()) {
            if (value.resetAt <= now) {
                this.store.delete(key);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

export class RateLimiter {
    private config: Required<RateLimiterConfig>;
    private storage: RateLimitStorage;
    private globalCounter: { count: number; resetAt: number } = { count: 0, resetAt: 0 };

    constructor(config: RateLimiterConfig = {}) {
        this.config = {
            defaultLimits: config.defaultLimits ?? { requests: 100, windowMs: 60000 },
            enableGlobalLimit: config.enableGlobalLimit ?? true,
            globalLimit: config.globalLimit ?? { requests: 1000, windowMs: 60000 },
            storage: config.storage ?? new MemoryRateLimitStorage(),
        };
    }

    async checkLimit(
        key: string,
        limits?: RateLimitConfig
    ): Promise<RateLimitInfo> {
        const effectiveLimits = limits || this.config.defaultLimits;
        const now = Date.now();

        if (this.config.enableGlobalLimit) {
            await this.checkGlobalLimit();
        }

        const result = await this.config.storage.increment(key, effectiveLimits.windowMs);
        const remaining = Math.max(0, effectiveLimits.requests - result.count);

        if (result.count > effectiveLimits.requests) {
            const resetAt = result.resetAt;
            throw new RateLimitError('Rate limit exceeded', {
                resetAt,
                limit: effectiveLimits.requests,
                remaining: 0,
            });
        }

        return {
            remaining,
            resetAt: result.resetAt,
            limit: effectiveLimits.requests,
        };
    }

    async checkUserLimit(userId: string, limits?: RateLimitConfig): Promise<RateLimitInfo> {
        return this.checkLimit(`user:${userId}`, limits);
    }

    async checkApiKeyLimit(apiKeyPrefix: string, limits?: RateLimitConfig): Promise<RateLimitInfo> {
        return this.checkLimit(`apikey:${apiKeyPrefix}`, limits);
    }

    async checkConnectorLimit(userId: string, connectorId: string, limits?: RateLimitConfig): Promise<RateLimitInfo> {
        return this.checkLimit(`connector:${userId}:${connectorId}`, limits);
    }

    async checkModelLimit(userId: string, modelId: string, limits?: RateLimitConfig): Promise<RateLimitInfo> {
        return this.checkLimit(`model:${userId}:${modelId}`, limits);
    }

    async checkEndpointLimit(userId: string, endpoint: string, limits?: RateLimitConfig): Promise<RateLimitInfo> {
        return this.checkLimit(`endpoint:${userId}:${endpoint}`, limits);
    }

    async checkIPLimit(ip: string, limits?: RateLimitConfig): Promise<RateLimitInfo> {
        return this.checkLimit(`ip:${ip}`, limits);
    }

    async checkGlobalLimit(): Promise<RateLimitInfo> {
        const now = Date.now();
        const globalLimit = this.config.globalLimit;

        if (this.globalCounter.resetAt <= now) {
            this.globalCounter = { count: 0, resetAt: now + globalLimit.windowMs };
        }

        this.globalCounter.count++;
        const remaining = Math.max(0, globalLimit.requests - this.globalCounter.count);

        if (this.globalCounter.count > globalLimit.requests) {
            throw new RateLimitError('Global rate limit exceeded', {
                resetAt: this.globalCounter.resetAt,
                limit: globalLimit.requests,
                remaining: 0,
            });
        }

        return {
            remaining,
            resetAt: this.globalCounter.resetAt,
            limit: globalLimit.requests,
        };
    }

    async getLimitInfo(key: string): Promise<RateLimitInfo | null> {
        const result = await this.config.storage.get(key);
        if (!result) return null;

        const limits = this.config.defaultLimits;
        return {
            remaining: Math.max(0, limits.requests - result.count),
            resetAt: result.resetAt,
            limit: limits.requests,
        };
    }

    async resetLimit(key: string): Promise<void> {
        await this.config.storage.reset(key);
    }

    async resetUserLimits(userId: string): Promise<void> {
        await this.config.storage.reset(`user:${userId}`);
    }

    setDefaultLimits(limits: RateLimitConfig): void {
        this.config.defaultLimits = limits;
    }

    setGlobalLimits(limits: RateLimitConfig): void {
        this.config.globalLimit = limits;
    }

    getDefaultLimits(): RateLimitConfig {
        return this.config.defaultLimits;
    }

    getGlobalLimits(): RateLimitConfig {
        return this.config.globalLimit;
    }

    destroy(): void {
        if (this.config.storage instanceof MemoryRateLimitStorage) {
            this.config.storage.destroy();
        }
    }
}

export const rateLimiter = new RateLimiter();

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
    return new RateLimiter(config);
}

export function createConnectorRateLimiter(
    connectorId: string,
    limits: RateLimitConfig
): RateLimiter {
    return new RateLimiter({ defaultLimits: limits });
}