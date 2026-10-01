const ENCRYPTION_KEY = Deno.env.get('CONNECTOR_ENCRYPTION_KEY')!;
const KEY_DERIVATION_ITERATIONS = 100000;

async function getEncryptionKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY);
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encrypt(data: string): Promise<string> {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedData: string): Promise<string> {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
    );
    return new TextDecoder().decode(decrypted);
}

export async function encryptObject<T>(obj: T): Promise<string> {
    return encrypt(JSON.stringify(obj));
}

export async function decryptObject<T>(encryptedData: string): Promise<T> {
    const decrypted = await decrypt(encryptedData);
    return JSON.parse(decrypted);
}

export async function rotateEncryptionKey(newKey: string): Promise<void> {
    const oldKey = Deno.env.get('CONNECTOR_ENCRYPTION_KEY');
    Deno.env.set('CONNECTOR_ENCRYPTION_KEY', newKey);
    
    // Note: In production, you would re-encrypt all stored credentials here
    // This is a placeholder for the key rotation logic
    
    Deno.env.set('CONNECTOR_ENCRYPTION_KEY', oldKey!);
}