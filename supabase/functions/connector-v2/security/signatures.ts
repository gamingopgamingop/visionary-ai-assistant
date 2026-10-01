export async function signHMACSHA256(key: string | Uint8Array, data: string | Uint8Array): Promise<string> {
    const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyHMACSHA256(key: string | Uint8Array, data: string | Uint8Array, signature: string): Promise<boolean> {
    const expected = await signHMACSHA256(key, data);
    return constantTimeCompare(expected, signature);
}

export async function signEd25519(privateKey: Uint8Array, data: string | Uint8Array): Promise<Uint8Array> {
    const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const key = await crypto.subtle.importKey(
        'raw',
        privateKey,
        { name: 'Ed25519' },
        false,
        ['sign']
    );
    return new Uint8Array(await crypto.subtle.sign('Ed25519', key, dataBuffer));
}

export async function verifyEd25519(publicKey: Uint8Array, data: string | Uint8Array, signature: Uint8Array): Promise<boolean> {
    const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const key = await crypto.subtle.importKey(
        'raw',
        publicKey,
        { name: 'Ed25519' },
        false,
        ['verify']
    );
    return crypto.subtle.verify('Ed25519', key, signature, dataBuffer);
}

export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export function constantTimeCompareBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }
    return result === 0;
}

export async function generateKeyPair(algorithm: 'Ed25519' | 'ECDSA' = 'Ed25519'): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    if (algorithm === 'Ed25519') {
        const keyPair = await crypto.subtle.generateKey(
            { name: 'Ed25519' },
            true,
            ['sign', 'verify']
        );
        const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
        const privateKey = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.privateKey));
        return { publicKey, privateKey };
    }
    throw new Error('Unsupported algorithm');
}