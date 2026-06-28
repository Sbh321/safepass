/**
 * Zero-Knowledge E2EE Cryptographic Primitives
 *
 * All operations use the native Web Crypto API (SubtleCrypto) exclusively.
 * No third-party cryptography libraries are used.
 *
 * Architecture:
 *   1. The user's Master Password is NEVER transmitted over the network.
 *   2. A random per-user salt is stored in the database (masterKeySalt).
 *   3. PBKDF2 derives a 256-bit AES key from (MasterPassword + salt) in the browser.
 *   4. The derived CryptoKey is held in Zustand in-memory and is lost on page refresh.
 *   5. Every VaultEntry is encrypted with AES-256-GCM using a fresh random 96-bit IV.
 *   6. The server stores only ciphertext and IV — it cannot decrypt vault entries.
 *
 * Key Derivation:  PBKDF2 (SHA-256, 310,000 iterations, 256-bit output)
 * Encryption:      AES-256-GCM (authenticated encryption with associated data support)
 * IV size:         96 bits (12 bytes) — NIST recommended for GCM
 * Salt size:       128 bits (16 bytes) — NIST SP 800-132 minimum
 */

/** Encoded as a hex string for database storage */
export type HexString = string;

/** AES-GCM ciphertext with its IV, both hex-encoded for API transport */
export interface EncryptedPayload {
  ciphertext: HexString;
  iv: HexString;
}

// ─── Encoding Utilities ──────────────────────────────────────────────────────

/**
 * Converts an ArrayBuffer to a lowercase hex string.
 * Hex is preferred over Base64 for IV/salt storage: no padding, URL-safe, debuggable.
 */
function bufferToHex(buffer: ArrayBuffer): HexString {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts a hex string back to a Uint8Array.
 */
function hexToBuffer(hex: HexString): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string length");
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// ─── Salt Generation ──────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random 128-bit (16-byte) salt.
 *
 * This is called once during Master Password setup and the hex-encoded result
 * is stored in the User.masterKeySalt database column.
 *
 * @returns A 32-character lowercase hex string representing 16 random bytes
 */
export function generateSalt(): HexString {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bufferToHex(salt.buffer);
}

// ─── Key Derivation (PBKDF2) ─────────────────────────────────────────────────

/**
 * Derives an AES-256-GCM CryptoKey from a Master Password and salt using PBKDF2.
 *
 * Parameters follow OWASP 2024 recommendations:
 *   - Algorithm: PBKDF2
 *   - Hash:      SHA-256
 *   - Iterations: 310,000 (OWASP minimum for SHA-256 as of 2024)
 *   - Key length: 256 bits
 *
 * The returned CryptoKey has extractable=false, meaning it cannot be serialized
 * back to raw bytes, providing an additional layer of key protection in the browser.
 *
 * @param masterPassword - The user's plaintext Master Password (never sent to server)
 * @param saltHex - The hex-encoded salt retrieved from the server (User.masterKeySalt)
 * @returns A non-extractable AES-GCM CryptoKey suitable for encrypt/decrypt operations
 */
export async function deriveKey(
  masterPassword: string,
  saltHex: HexString
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(masterPassword);
  const saltBytes = hexToBuffer(saltHex);

  // Import the raw password bytes as a PBKDF2 key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false, // not extractable
    ["deriveKey"]
  );

  // Derive the final AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 310_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // not extractable — key bytes cannot be read back from the CryptoKey object
    ["encrypt", "decrypt"]
  );
}

// ─── Encryption (AES-256-GCM) ────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM with a fresh random IV.
 *
 * GCM (Galois/Counter Mode) provides both confidentiality and integrity:
 * the 128-bit authentication tag appended to the ciphertext will cause
 * decryption to fail if either the ciphertext or the IV is tampered with.
 *
 * A new IV MUST be generated for every encryption operation. Reusing an IV
 * with the same key in GCM mode is catastrophic: it leaks the keystream and
 * allows an attacker to recover the XOR of any two plaintexts encrypted with
 * the same (key, IV) pair.
 *
 * @param key - The AES-256-GCM CryptoKey derived via `deriveKey()`
 * @param plaintext - The password string to encrypt
 * @returns An EncryptedPayload containing hex-encoded ciphertext and IV
 */
export async function encryptSecret(
  key: CryptoKey,
  plaintext: string
): Promise<EncryptedPayload> {
  const iv = new Uint8Array(12); // 96-bit IV — NIST recommended for AES-GCM
  crypto.getRandomValues(iv);

  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes
  );

  return {
    ciphertext: bufferToHex(ciphertextBuffer),
    iv: bufferToHex(iv.buffer),
  };
}

// ─── Decryption (AES-256-GCM) ────────────────────────────────────────────────

/**
 * Decrypts an AES-256-GCM ciphertext back to plaintext.
 *
 * Throws a DOMException with name "OperationError" if:
 *   - The authentication tag does not match (data was tampered with)
 *   - The key is incorrect (wrong Master Password was used to derive the key)
 *   - The IV does not match the one used during encryption
 *
 * @param key - The AES-256-GCM CryptoKey derived via `deriveKey()`
 * @param payload - The EncryptedPayload from `encryptSecret()` or the database
 * @returns The original plaintext password string
 * @throws DOMException if authentication fails or key/IV is wrong
 */
export async function decryptSecret(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<string> {
  const ciphertextBytes = hexToBuffer(payload.ciphertext);
  const ivBytes = hexToBuffer(payload.iv);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    ciphertextBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBuffer);
}

// ─── Account Password Hashing ────────────────────────────────────────────────

/**
 * Hashes an account login password for storage using PBKDF2-SHA256.
 *
 * Note: This is for the ACCOUNT password (used for NextAuth login), NOT the
 * Master Password. The Master Password is handled separately and never reaches
 * the server.
 *
 * In production, prefer using bcrypt or Argon2 server-side (via bcryptjs or argon2).
 * This PBKDF2 variant runs client-side before sending to the server as an additional
 * pre-hashing layer — the server should apply bcrypt on top.
 *
 * @param password - The account password to hash
 * @param saltHex - A random hex salt (generate with generateSalt())
 * @returns Hex-encoded PBKDF2 hash
 */
export async function hashAccountPassword(
  password: string,
  saltHex: HexString
): Promise<HexString> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const saltBytes = hexToBuffer(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 310_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return bufferToHex(hashBuffer);
}

/**
 * Verifies an account password against a stored hash.
 * Uses a constant-time comparison via re-derivation (timing-safe for this context).
 *
 * @param password - Candidate password
 * @param saltHex - The stored salt hex
 * @param storedHashHex - The stored hash hex
 * @returns true if the password matches, false otherwise
 */
export async function verifyAccountPassword(
  password: string,
  saltHex: HexString,
  storedHashHex: HexString
): Promise<boolean> {
  const candidateHash = await hashAccountPassword(password, saltHex);
  // Constant-time string comparison to prevent timing attacks
  if (candidateHash.length !== storedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
  }
  return diff === 0;
}
