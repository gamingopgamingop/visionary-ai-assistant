export async function hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyApiKeyHash(key: string, hash: string): Promise<boolean> {
    const expected = await hashApiKey(key);
    return constantTimeCompare(expected, hash);
}

export function generateApiKey(prefix: string = 'vk'): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const randomPart = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return `${prefix}_${randomPart}`;
}

export function parseApiKeyPrefix(key: string): string | null {
    const parts = key.split('_');
    if (parts.length >= 2) {
        return parts[0];
    }
    return null;
}

export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export interface ApiKeyMetadata {
    prefix: string;
    hash: string;
    scopes: string[];
    expiresAt?: number;
    createdAt: number;
}

export async function createApiKeyMetadata(
    prefix: string,
    key: string,
    scopes: string[],
    expiresAt?: number
): Promise<ApiKeyMetadata> {
    const hash = await hashApiKey(key);
    return {
        prefix,
        hash,
        scopes,
        expiresAt,
        createdAt: Date.now(),
    };
}