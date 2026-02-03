import { createClient } from "@/lib/supabase/server";
import { verifyMessage } from "viem";
import { walletAddressSchema } from "./validation";

// === SIWE (Sign-In with Ethereum) VERIFICATION ===

export interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

// Generate SIWE message for signing
export function createSIWEMessage(params: {
  domain: string;
  address: string;
  nonce: string;
  chainId: number;
}): string {
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

  return `${params.domain} wants you to sign in with your Ethereum account:
${params.address}

Sign in to TheEndGame Arena

URI: https://${params.domain}
Version: 1
Chain ID: ${params.chainId}
Nonce: ${params.nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
}

// Parse SIWE message string
export function parseSIWEMessage(message: string): SIWEMessage | null {
  try {
    const lines = message.split("\n");
    const domain = lines[0]?.split(" wants you")[0] || "";
    const address = lines[1] || "";
    
    const getField = (name: string): string => {
      const line = lines.find((l) => l.startsWith(`${name}: `));
      return line?.replace(`${name}: `, "") || "";
    };

    return {
      domain,
      address,
      statement: lines[3] || "",
      uri: getField("URI"),
      version: getField("Version"),
      chainId: parseInt(getField("Chain ID")) || 0,
      nonce: getField("Nonce"),
      issuedAt: getField("Issued At"),
      expirationTime: getField("Expiration Time") || undefined,
    };
  } catch {
    return null;
  }
}

// Verify SIWE signature
export async function verifySIWE(
  message: string,
  signature: `0x${string}`,
  expectedAddress: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Parse and validate message
    const parsed = parseSIWEMessage(message);
    if (!parsed) {
      return { valid: false, error: "Invalid message format" };
    }

    // Validate address format
    const addressResult = walletAddressSchema.safeParse(parsed.address);
    if (!addressResult.success) {
      return { valid: false, error: "Invalid address in message" };
    }

    // Check address matches expected
    if (addressResult.data !== expectedAddress.toLowerCase()) {
      return { valid: false, error: "Address mismatch" };
    }

    // Check expiration
    if (parsed.expirationTime) {
      const expiry = new Date(parsed.expirationTime);
      if (expiry < new Date()) {
        return { valid: false, error: "Message expired" };
      }
    }

    // Check issued time (not too old, not in future)
    const issuedAt = new Date(parsed.issuedAt);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (issuedAt < fiveMinutesAgo || issuedAt > fiveMinutesFromNow) {
      return { valid: false, error: "Invalid issuance time" };
    }

    // Verify signature cryptographically
    const recoveredAddress = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature,
    });

    if (!recoveredAddress) {
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true };
  } catch (error) {
    // Don't leak error details
    console.error("[Auth] SIWE verification error:", error);
    return { valid: false, error: "Verification failed" };
  }
}

// Generate cryptographically secure nonce
export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// === SESSION MANAGEMENT ===

// Get current session from Supabase
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("[Auth] Session error:", error.message);
    return null;
  }

  return session;
}

// Get authenticated user
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[Auth] User error:", error.message);
    return null;
  }

  return user;
}

// Verify wallet ownership for API routes
export async function verifyWalletOwnership(
  request: Request,
  walletAddress: string
): Promise<boolean> {
  // Get signature from header
  const signature = request.headers.get("X-Wallet-Signature") as `0x${string}` | null;
  const message = request.headers.get("X-Wallet-Message");
  const timestamp = request.headers.get("X-Wallet-Timestamp");

  if (!signature || !message || !timestamp) {
    return false;
  }

  // Check timestamp freshness (5 minute window)
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }

  // Verify signature
  const result = await verifySIWE(message, signature, walletAddress);
  return result.valid;
}
