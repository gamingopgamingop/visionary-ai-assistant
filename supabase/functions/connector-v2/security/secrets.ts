import { encrypt, decrypt } from './encryption.ts';

const SECRETS_PREFIX = 'secret_';

export interface StoredSecret {
    id: string;
    name: string;
    value: string;
    metadata?: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
}

export async function storeSecret(
    name: string,
    value: string,
    metadata?: Record<string, unknown>
): Promise<StoredSecret> {
    const encrypted = await encrypt(value);
    const secret: StoredSecret = {
        id: `${SECRETS_PREFIX}${crypto.randomUUID()}`,
        name,
        value: encrypted,
        metadata,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    return secret;
}

export async function retrieveSecret(secret: StoredSecret): Promise<string> {
    return decrypt(secret.value);
}

export async function updateSecret(
    secret: StoredSecret,
    value: string,
    metadata?: Record<string, unknown>
): Promise<StoredSecret> {
    const encrypted = await encrypt(value);
    return {
        ...secret,
        value: encrypted,
        metadata: metadata ?? secret.metadata,
        updatedAt: Date.now(),
    };
}

export async function rotateSecret(secret: StoredSecret, newValue: string): Promise<StoredSecret> {
    return updateSecret(secret, newValue);
}

export function createSecretReference(secretId: string): string {
    return `${SECRETS_PREFIX}${secretId}`;
}

export function parseSecretReference(ref: string): string | null {
    if (ref.startsWith(SECRETS_PREFIX)) {
        return ref.slice(SECRETS_PREFIX.length);
    }
    return null;
}