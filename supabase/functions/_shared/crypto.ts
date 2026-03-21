/**
 * AES-256-GCM encryption / decryption for third-party API tokens.
 * Uses SUPABASE_SERVICE_ROLE_KEY as the key-derivation seed so no extra
 * secret is needed.  IV is prepended to the ciphertext.
 */

const ALGO = "AES-GCM";
const IV_LEN = 12; // 96-bit IV recommended for GCM

async function deriveKey(): Promise<CryptoKey> {
  const seed = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!seed) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for encryption");

  const raw = new TextEncoder().encode(seed);
  const hash = await crypto.subtle.digest("SHA-256", raw);

  return crypto.subtle.importKey("raw", hash, { name: ALGO }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt a plaintext string → base64 ciphertext (IV + encrypted bytes). */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  const combined = new Uint8Array(IV_LEN + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), IV_LEN);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64 ciphertext → plaintext string. */
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await deriveKey();
  const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, IV_LEN);
  const data = raw.slice(IV_LEN);
  const plainBuf = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

/** Encrypt credential values in a JSON object (shallow). */
export async function encryptCredentials(
  creds: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    result[k] = v ? await encrypt(v) : v;
  }
  return result;
}

/** Decrypt credential values in a JSON object (shallow). */
export async function decryptCredentials(
  creds: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    try {
      result[k] = v ? await decrypt(v) : v;
    } catch {
      // If decryption fails, it may be a legacy unencrypted value
      result[k] = v;
    }
  }
  return result;
}
