export async function sha256(data: string | Uint8Array): Promise<string> {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha512(data: string | Uint8Array): Promise<string> {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hash = await crypto.subtle.digest('SHA-512', buffer);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256(key: string | Uint8Array, data: string | Uint8Array): Promise<string> {
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

export async function encryptAESGCM(key: string | Uint8Array, plaintext: string): Promise<string> {
    const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const keyHash = await crypto.subtle.digest('SHA-256', keyBuffer);
    const cryptoKey = await crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['encrypt']);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
}

export async function decryptAESGCM(key: string | Uint8Array, ciphertext: string): Promise<string> {
    const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const keyHash = await crypto.subtle.digest('SHA-256', keyBuffer);
    const cryptoKey = await crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['decrypt']);
    
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted);
    return new TextDecoder().decode(decrypted);
}

export function generateRandomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
}

export function generateRandomString(length: number): string {
    const array = generateRandomBytes(length);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUUID(): string {
    return crypto.randomUUID();
}

export function base64Encode(data: string | Uint8Array): string {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return btoa(String.fromCharCode(...buffer));
}

export function base64Decode(data: string): Uint8Array {
    const binary = atob(data);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
}

export function base64UrlEncode(data: string | Uint8Array): string {
    return base64Encode(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64UrlDecode(data: string): Uint8Array {
    let padded = data.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) {
        padded += '=';
    }
    return base64Decode(padded);
}

export async function verifyHMAC(key: string | Uint8Array, data: string | Uint8Array, signature: string): Promise<boolean> {
    const expected = await hmacSha256(key, data);
    const expectedBytes = new Uint8Array(expected.length / 2);
    for (let i = 0; i < expected.length; i += 2) {
        expectedBytes[i / 2] = parseInt(expected.slice(i, i + 2), 16);
    }
    const signatureBytes = new Uint8Array(signature.length / 2);
    for (let i = 0; i < signature.length; i += 2) {
        signatureBytes[i / 2] = parseInt(signature.slice(i, i + 2), 16);
    }
    return crypto.subtle.timingSafeEqual(expectedBytes, signatureBytes);
}

export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}