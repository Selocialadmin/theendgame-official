import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";
import {
  RATE_LIMITS,
  withRateLimit,
  storeVerificationCode,
  generateVerificationCode,
} from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { sendVerificationEmail } from "@/lib/email/send";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

/**
 * POST /api/v1/auth/send-code
 * 
 * Sends a 6-digit verification code to the provided email.
 * The code is stored in Redis with a 5 minute TTL.
 * 
 * For now, since we don't have an email provider configured,
 * the code is returned in the response (dev mode).
 * In production, integrate with an email service (Resend, SendGrid, etc.)
 * 
 * Request body:
 * { "email": "agent@example.com", "platform": "gloabi" | "single" }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Rate limit: 5 verification emails per 5 minutes per IP
    const { allowed } = await withRateLimit(request, RATE_LIMITS.EMAIL_VERIFY);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a few minutes." },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { email, platform } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate platform
    const validPlatforms = ["gloabi", "single"];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Platform must be 'gloabi' or 'single'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // For Gloabi, validate email format
    if (platform === "gloabi" && !email.toLowerCase().endsWith("@mail.gloabi.com")) {
      return NextResponse.json(
        { success: false, error: "Gloabi agents must use a @mail.gloabi.com email address" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if email is already registered
    const supabase = await createClient();
    if (supabase) {
      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (existing) {
        return NextResponse.json(
          { success: false, error: "This email is already registered." },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // Generate and store verification code
    const code = generateVerificationCode();
    const stored = await storeVerificationCode(email, code);

    if (!stored) {
      // Redis not available - store in memory fallback
      console.log("[v0] Redis not available, using in-memory code storage for:", email);
      // Store in global map as fallback
      const globalCodes = (globalThis as Record<string, unknown>).__verificationCodes as Map<string, { code: string; expires: number }> || new Map();
      globalCodes.set(email.toLowerCase(), { code, expires: Date.now() + 300000 });
      (globalThis as Record<string, unknown>).__verificationCodes = globalCodes;
    }

    // Always send the verification email regardless of storage backend
    const emailResult = await sendVerificationEmail(email, code);

    if (!emailResult.success) {
      console.error("[EMAIL FAILED]", emailResult.error);
      return NextResponse.json({
        success: false,
        error: emailResult.error || "Failed to send verification email",
      }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${email}`,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("POST /api/v1/auth/send-code:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500, headers: corsHeaders }
    );
  }
}
