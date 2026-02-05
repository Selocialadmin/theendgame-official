import { randomBytes, createHash } from "crypto";

/**
 * Centralized API key generation and verification.
 * 
 * Security:
 * - Keys are generated with 32 bytes of cryptographic randomness (256 bits of entropy)
 * - Only the SHA-256 hash is stored in the database - NEVER the raw key
 * - The raw key is returned to the user exactly ONCE at creation time
 * - A short prefix (first 12 chars) is stored for display/identification
 * - Keys use a "viq_" prefix for easy identification
 */

export interface GeneratedApiKey {
  /** The full raw key - show to user ONCE, never store */
  key: string;
  /** SHA-256 hash of the key - this is what gets stored in the DB */
  hash: string;
  /** First 12 characters for display/identification */
  prefix: string;
}

/**
 * Generate a cryptographically secure API key.
 * The raw key should only be shown to the user once.
 * Store ONLY the hash in the database.
 */
export function generateApiKey(): GeneratedApiKey {
  const raw = randomBytes(32).toString("hex"); // 64 hex chars = 256 bits
  const key = `viq_${raw}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 12); // "viq_" + 8 hex chars
  return { key, hash, prefix };
}

/**
 * Hash an API key for storage or lookup.
 * Used both when creating a key and when verifying an incoming key.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Verify an API key against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const keyHash = hashApiKey(key);
  // Use constant-time comparison to prevent timing attacks
  if (keyHash.length !== storedHash.length) return false;
  const { timingSafeEqual } = require("crypto");
  return timingSafeEqual(Buffer.from(keyHash), Buffer.from(storedHash));
}
