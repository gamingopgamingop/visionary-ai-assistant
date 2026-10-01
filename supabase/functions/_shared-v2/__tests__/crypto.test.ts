import { 
    sha256, 
    sha512, 
    hmacSha256, 
    encryptAESGCM, 
    decryptAESGCM, 
    generateRandomBytes, 
    generateRandomString, 
    generateUUID, 
    base64Encode, 
    base64Decode, 
    base64UrlEncode, 
    base64UrlDecode, 
    verifyHMAC, 
    constantTimeCompare 
} from '../crypto.ts';

Deno.test("sha256 - string input", async () => {
    const result = await sha256("hello world");
    const expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
    if (result !== expected) throw new Error(`Expected ${expected}, got ${result}`);
});

Deno.test("sha256 - Uint8Array input", async () => {
    const result = await sha256(new TextEncoder().encode("hello world"));
    const expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
    if (result !== expected) throw new Error(`Expected ${expected}, got ${result}`);
});

Deno.test("sha512 - string input", async () => {
    const result = await sha512("hello world");
    if (result.length !== 128) throw new Error(`Expected 128 chars, got ${result.length}`);
});

Deno.test("hmacSha256 - string key and data", async () => {
    const result = await hmacSha256("secret", "message");
    if (result.length !== 64) throw new Error(`Expected 64 chars, got ${result.length}`);
});

Deno.test("hmacSha256 - Uint8Array key and data", async () => {
    const result = await hmacSha256(new TextEncoder().encode("secret"), new TextEncoder().encode("message"));
    if (result.length !== 64) throw new Error(`Expected 64 chars, got ${result.length}`);
});

Deno.test("encryptAESGCM / decryptAESGCM - round trip", async () => {
    const key = "test-encryption-key-32-bytes-long!";
    const plaintext = "Hello, World! This is a test message.";
    
    const encrypted = await encryptAESGCM(key, plaintext);
    if (!encrypted || typeof encrypted !== 'string') throw new Error("Encryption failed");
    
    const decrypted = await decryptAESGCM(key, encrypted);
    if (decrypted !== plaintext) throw new Error(`Decryption failed: expected "${plaintext}", got "${decrypted}"`);
});

Deno.test("encryptAESGCM - different keys produce different ciphertext", async () => {
    const plaintext = "test message";
    const encrypted1 = await encryptAESGCM("key1", plaintext);
    const encrypted2 = await encryptAESGCM("key2", plaintext);
    
    if (encrypted1 === encrypted2) throw new Error("Different keys produced same ciphertext");
});

Deno.test("generateRandomBytes - correct length", () => {
    const bytes = generateRandomBytes(32);
    if (bytes.length !== 32) throw new Error(`Expected 32 bytes, got ${bytes.length}`);
});

Deno.test("generateRandomString - correct length", () => {
    const str = generateRandomString(16);
    if (str.length !== 32) throw new Error(`Expected 32 chars (16 bytes hex), got ${str.length}`);
});

Deno.test("generateUUID - valid format", () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) throw new Error(`Invalid UUID format: ${uuid}`);
});

Deno.test("base64Encode / base64Decode - round trip", () => {
    const original = "Hello, World! 🌍";
    const encoded = base64Encode(original);
    const decoded = base64Decode(encoded);
    const result = new TextDecoder().decode(decoded);
    
    if (result !== original) throw new Error(`Base64 round trip failed: expected "${original}", got "${result}"`);
});

Deno.test("base64UrlEncode / base64UrlDecode - round trip", () => {
    const original = "Hello, World! 🌍";
    const encoded = base64UrlEncode(original);
    const decoded = base64UrlDecode(encoded);
    const result = new TextDecoder().decode(decoded);
    
    if (result !== original) throw new Error(`Base64URL round trip failed: expected "${original}", got "${result}"`);
});

Deno.test("verifyHMAC - valid signature", async () => {
    const key = "secret-key";
    const data = "test data";
    const signature = await hmacSha256(key, data);
    
    const valid = await verifyHMAC(key, data, signature);
    if (!valid) throw new Error("Valid signature rejected");
});

Deno.test("verifyHMAC - invalid signature", async () => {
    const key = "secret-key";
    const data = "test data";
    const invalidSignature = "00".repeat(32);
    
    const valid = await verifyHMAC(key, data, invalidSignature);
    if (valid) throw new Error("Invalid signature accepted");
});

Deno.test("constantTimeCompare - equal strings", () => {
    const result = constantTimeCompare("hello", "hello");
    if (!result) throw new Error("Equal strings not equal");
});

Deno.test("constantTimeCompare - different strings", () => {
    const result = constantTimeCompare("hello", "world");
    if (result) throw new Error("Different strings equal");
});

Deno.test("constantTimeCompare - different lengths", () => {
    const result = constantTimeCompare("hello", "hello world");
    if (result) throw new Error("Different length strings equal");
});